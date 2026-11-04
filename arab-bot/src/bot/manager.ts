import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { Bot, Context, GrammyError, HttpError, webhookCallback } from 'grammy';
import { db, getTashkentDate } from '../db/index.js';
import { config } from '../config.js';
import { I18nService } from './i18n.js';
import { BotKeyboards } from './keyboards.js';
import { UserSessionState } from './types.js';
import {
  BookTopicPlanItem,
  BookWritingEvaluation,
  capCefrLevel,
  getBookTopicExcerpt,
  getNextBookTopicIndex,
  getReviewBookTopicIndex,
  GeminiService,
  normalizeCefrLevel,
} from '../services/gemini.js';
import { containsReligiousMaterial } from '../services/contentPolicy.js';
import {
  AcademyGroupAccess,
  getAcademyGroupBook,
  getAcademyStudentMembership,
  getAcademyStudentStats,
  submitAcademyReview,
  verifyAcademyGroupCode,
} from '../services/academySync.js';

type TelegramWebhookHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class BotManager {
  private static instance: BotManager;
  private bot: Bot | null = null;
  private webhookHandler: TelegramWebhookHandler | null = null;
  private isRunning: boolean = false;
  private usesPolling: boolean = false;
  private currentToken: string = '';
  private sessions = new Map<number, UserSessionState>();
  private lastInvalidAttemptAt = new Map<number, number>();
  private adminPasswordFailures = new Map<number, { attempts: number; lockedUntil: number }>();

  private constructor() { }

  public static getInstance(): BotManager {
    if (!BotManager.instance) {
      BotManager.instance = new BotManager();
    }
    return BotManager.instance;
  }

  public getSession(telegramId: number): UserSessionState {
    if (!this.sessions.has(telegramId)) {
      this.sessions.set(telegramId, {
        state: 'idle',
        selectedGroupId: 0,
        activeStudyTopicNumber: null,
        activeStudyQuestion: null,
        activeStudyQuestionType: null,
        activeStudyReviewTopicNumber: 0,
      });
    }
    return this.sessions.get(telegramId)!;
  }

  public clearSession(telegramId: number): void {
    const s = this.getSession(telegramId);
    this.sessions.set(telegramId, {
      state: 'idle',
      isAdmin: s.isAdmin,
      selectedGroupId: 0,
      activeStudyTopicNumber: null,
      activeStudyQuestion: null,
      activeStudyQuestionType: null,
      activeStudyReviewTopicNumber: 0,
    });
  }

  private async getRecentBookQuestions(telegramId: number, groupId: number): Promise<string[]> {
    const result = await db.query(
      `SELECT question FROM (
         SELECT question, created_at FROM user_quiz_history
         WHERE telegram_id = $1 AND academy_group_id = $2
         UNION ALL
         SELECT question, created_at FROM ai_tutor_question_history
         WHERE telegram_id = $1 AND academy_group_id = $2
       ) recent_questions
       ORDER BY created_at DESC LIMIT 30`,
      [telegramId, groupId]
    );

    return [...new Set(
      result.rows
        .map((row: any) => String(row.question || '').trim().slice(0, 300))
        .filter(Boolean)
    )].slice(0, 30);
  }

  private async getBookLearningProgress(
    telegramId: number,
    groupId: number,
    bookId: number,
    bookText: string
  ): Promise<{
    topics: BookTopicPlanItem[];
    currentTopicIndex: number;
    previousScore: number | null;
    previousTopicIndex: number | null;
  }> {
    const normalizedBook = bookText.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
    let planResult = await db.query(
      'SELECT topics_json FROM academy_book_topic_plans WHERE book_id = $1',
      [bookId]
    );
    let topics: BookTopicPlanItem[] = [];
    const isValidPlan = (candidate: unknown): candidate is BookTopicPlanItem[] => {
      if (!Array.isArray(candidate) || candidate.length === 0) return false;
      let previousPosition = -1;
      for (const topic of candidate) {
        if (
          !topic ||
          typeof topic.title !== 'string' ||
          typeof topic.summary !== 'string' ||
          typeof topic.rules !== 'string' ||
          typeof topic.sourceQuote !== 'string' ||
          containsReligiousMaterial(`${topic.title}\n${topic.summary}\n${topic.rules}\n${topic.sourceQuote}`)
        ) return false;
        const quote = topic.sourceQuote.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
        const position = quote.length >= 20 ? normalizedBook.indexOf(quote, previousPosition + 1) : -1;
        if (position < 0 || position <= previousPosition) return false;
        previousPosition = position;
      }
      return true;
    };
    if (planResult.rows[0]?.topics_json) {
      try {
        const parsed = JSON.parse(String(planResult.rows[0].topics_json));
        if (isValidPlan(parsed)) {
          topics = parsed as BookTopicPlanItem[];
        }
      } catch (error) {
        console.warn('[AI Tutor] Kitob mavzularining saqlangan rejasi o‘qilmadi:', error);
      }
    }

    if (topics.length === 0) {
      const generatedTopics = await GeminiService.generateBookTopicPlan(bookText);
      if (planResult.rows.length > 0) {
        await db.query(
          `UPDATE academy_book_topic_plans
           SET topics_json = $1, updated_at = CURRENT_TIMESTAMP
           WHERE book_id = $2`,
          [JSON.stringify(generatedTopics), bookId]
        );
      } else {
        await db.query(
          `INSERT INTO academy_book_topic_plans (book_id, topics_json)
           VALUES ($1, $2)
           ON CONFLICT (book_id) DO NOTHING`,
          [bookId, JSON.stringify(generatedTopics)]
        );
      }
      planResult = await db.query(
        'SELECT topics_json FROM academy_book_topic_plans WHERE book_id = $1',
        [bookId]
      );
      try {
        const storedPlan = JSON.parse(String(planResult.rows[0]?.topics_json || '[]'));
        if (!isValidPlan(storedPlan)) {
          throw new Error('Kitobning ketma-ket mavzular rejasi yaroqsiz');
        }
        topics = storedPlan;
      } catch (error) {
        throw new Error(`Kitob mavzulari rejasini bazadan o‘qib bo‘lmadi: ${String(error)}`);
      }
    }

    await db.query(
      `INSERT INTO academy_book_learning_progress
       (telegram_id, academy_group_id, book_id, current_topic_index)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (telegram_id, academy_group_id, book_id) DO NOTHING`,
      [telegramId, groupId, bookId]
    );
    const progressResult = await db.query(
      `SELECT current_topic_index, previous_score, previous_topic_index
       FROM academy_book_learning_progress
       WHERE telegram_id = $1 AND academy_group_id = $2 AND book_id = $3`,
      [telegramId, groupId, bookId]
    );
    const progress = progressResult.rows[0];
    return {
      topics,
      currentTopicIndex: Math.min(
        Math.max(0, Number(progress?.current_topic_index) || 0),
        topics.length - 1
      ),
      previousScore: progress?.previous_score === null || progress?.previous_score === undefined
        ? null
        : Number(progress.previous_score),
      previousTopicIndex: progress?.previous_topic_index === null || progress?.previous_topic_index === undefined
        ? null
        : Number(progress.previous_topic_index),
    };
  }

  private async saveTutorQuestion(
    telegramId: number,
    groupId: number,
    bookId: number,
    question: string
  ): Promise<void> {
    try {
      await db.query(
        `INSERT INTO ai_tutor_question_history
         (telegram_id, academy_group_id, book_id, question)
         VALUES ($1, $2, $3, $4)`,
        [telegramId, groupId, bookId, question]
      );
    } catch (error) {
      console.warn('[AI Tutor] Savol takrorlanish tarixga saqlanmadi:', error);
    }
  }

  private formatWritingTask(task: string, level: string, number: number, lang: string, isNext = false): string {
    const heading = lang === 'ru'
      ? `${isNext ? 'Следующее' : 'Письменное'} задание на арабском · CEFR ${level} · ${number}/5`
      : lang === 'en'
        ? `${isNext ? 'Next' : 'Arabic writing'} practice · CEFR ${level} · ${number}/5`
        : `${isNext ? 'Keyingi arabcha yozma mashq' : 'Arabcha yozma mashq'} · CEFR ${level} · ${number}/5`;
    const instruction = lang === 'ru'
      ? 'Ответьте арабским письмом; не используйте транслитерацию.'
      : lang === 'en'
        ? 'Write your answer in Arabic script; do not use transliteration.'
        : 'Javobingizni arab yozuvida yuboring; transliteratsiya yozmang.';
    return `✍️ ${heading}\n\n${task}\n\n${instruction}`;
  }

  private formatWritingEvaluation(
    evaluation: BookWritingEvaluation,
    level: string,
    lang: string
  ): string {
    const labels = lang === 'ru'
      ? {
          level: `🧭 Уровень CEFR ${level}`,
          strength: '✨ Сильная сторона',
          errors: '🔎 Исправления',
          noErrors: '✅ Существенных ошибок не найдено.',
          corrected: '📝 Исправленный текст',
          remaining: (count: number) => `Ещё ${count} ошибок исправлены в тексте.`,
        }
      : lang === 'en'
        ? {
            level: `🧭 CEFR ${level}`,
            strength: '✨ Strength',
            errors: '🔎 Corrections',
            noErrors: '✅ No significant spelling or grammar errors found.',
            corrected: '📝 Corrected text',
            remaining: (count: number) => `${count} additional errors are corrected in the text.`,
          }
        : {
            level: `🧭 CEFR ${level}`,
            strength: '✨ Kuchli jihat',
            errors: '🔎 Tuzatishlar',
            noErrors: '✅ Muhim imlo yoki grammatika xatosi topilmadi.',
            corrected: '📝 Tahrirlangan matn',
            remaining: (count: number) => `Qolgan ${count} ta xato tahrirlangan matnda tuzatildi.`,
          };
    const lines = [
      labels.level,
      evaluation.feedback.slice(0, 400),
      `${labels.strength}: ${evaluation.strength.slice(0, 140)}`,
    ];
    if (evaluation.errors.length > 0) {
      lines.push(`${labels.errors} (${Math.min(evaluation.errors.length, 4)}):`);
      for (const error of evaluation.errors.slice(0, 4)) {
        lines.push(
          `• ${error.original.slice(0, 100)} → ${error.correction.slice(0, 100)} — ${error.explanation.slice(0, 140)}`
        );
      }
      if (evaluation.errors.length > 4) {
        lines.push(labels.remaining(evaluation.errors.length - 4));
      }
    } else {
      lines.push(labels.noErrors);
    }
    if (evaluation.correctedText) {
      lines.push(`${labels.corrected}:\n${evaluation.correctedText.slice(0, 1400)}`);
    }
    return lines.join('\n\n');
  }

  /**
   * Admin bilan to'g'ridan-to'g'ri Telegram shaxsiy chatiga o'tish havolasi
   * Faqat bitta ADMIN_ID ishlatiladi!
   */
  public getAdminTelegramUrl(prefilledText?: string): string {
    const adminId = (config.adminTelegramContact || config.adminId || '8145529224').trim().replace(/^@/, '');
    if (/^https?:\/\//i.test(adminId)) return adminId;

    // Agar raqam bo'lsa (masalan 8145529224) - Telegram chatini to'g'ridan-to'g'ri ochadi
    if (/^\d+$/.test(adminId)) {
      return `tg://user?id=${adminId}`;
    }

    if (prefilledText) {
      return `https://t.me/${adminId}?text=${encodeURIComponent(prefilledText)}`;
    }
    return `https://t.me/${adminId}`;
  }

  public async getStatus(): Promise<{ isRunning: boolean; hasToken: boolean; botUsername?: string }> {
    const hasToken = Boolean(config.botToken && config.botToken.trim().length > 0);
    let botUsername: string | undefined;

    if (this.bot && this.isRunning) {
      try {
        const me = await this.bot.api.getMe();
        botUsername = me.username;
      } catch { }
    }

    return {
      isRunning: this.isRunning,
      hasToken,
      botUsername,
    };
  }

  /**
   * Botni ishga tushirish (Faqat 1 ta BOT_TOKEN bilan ishlaydi)
   */
  public async start(): Promise<void> {
    const activeToken = (config.botToken || '').trim();

    if (!activeToken) {
      console.error('❌ [Telegram Bot] Bot tokeni (.env dagi BOT_TOKEN) topilmadi.');
      this.isRunning = false;
      return;
    }
    if (!/^\d+$/.test(config.adminId)) {
      console.warn('⚠️ [Telegram Bot] ADMIN_ID raqamli Telegram ID bo‘lishi kerak; /admin buyrug‘i ishlamaydi.');
    }

    if (this.isRunning && this.currentToken === activeToken) {
      console.log(`ℹ️ [Telegram Bot] Bot allaqachon ushbu token bilan ishlamoqda.`);
      return;
    }

    if (this.isRunning) {
      await this.stop();
    }

    try {
      console.log('🔍 [Telegram Bot] Bot tokeni tekshirilmoqda...');
      const testBot = new Bot(activeToken);
      const me = await testBot.api.getMe();
      console.log(`✅ [Telegram Bot] Bot yaroqli: @${me.username}`);

      this.currentToken = activeToken;
      this.bot = new Bot(activeToken);
      this.setupHandlers(this.bot);

      // Buyruqlarni o'rnatish: Faqat /start
      await this.bot.api.setMyCommands([
        { command: 'start', description: "Botni qayta ishga tushirish" },
        { command: 'review', description: "Kurs haqida sharh yuborish" },
      ]).catch(() => { });

      await this.bot.api.setChatMenuButton({
        menu_button: { type: 'default' },
      }).catch(() => { });

      if (config.telegramWebhookUrl) {
        const webhookUrl = new URL('/telegram/webhook', config.telegramWebhookUrl);
        if (webhookUrl.protocol !== 'https:') {
          throw new Error('TELEGRAM_WEBHOOK_URL HTTPS manzili bo‘lishi kerak');
        }
        const secret = config.telegramWebhookSecret || createHmac('sha256', activeToken)
          .update('arabic-academy-telegram-webhook')
          .digest('hex');
        this.webhookHandler = webhookCallback(this.bot, 'express', { secretToken: secret });
        await this.bot.api.setWebhook(webhookUrl.toString(), {
          secret_token: secret,
          allowed_updates: ['message', 'callback_query'],
        });
        this.usesPolling = false;
        this.isRunning = true;
        console.log(`🚀 [Telegram Bot] @${me.username} HTTPS webhook bilan ishga tushdi.`);
        return;
      }

      this.webhookHandler = null;
      await this.bot.api.deleteWebhook({ drop_pending_updates: true }).catch((err) => {
        console.warn('⚠️ [Telegram Bot] Webhook tozalashda ogohlantirish:', err.message);
      });

      this.usesPolling = true;
      this.bot
        .start({
          onStart: (info) => {
            this.isRunning = true;
            console.log(`🚀 [Telegram Bot] @${info.username} muvaffaqiyatli ishga tushdi!`);
          },
        })
        .catch((err) => {
          this.isRunning = false;
          this.usesPolling = false;
          const message = err?.message || String(err);
          if (/409|terminated by other getUpdates request|conflict/i.test(message)) {
            console.error('❌ [Telegram Bot] Shu BOT_TOKEN bilan boshqa bot jarayoni ham ishlayapti. Sayt backend va bot service orasida bitta polling nusxasini qoldiring.');
          }
          console.warn('⚠️ [Telegram Bot] Polling xatosi:', message);
        });
    } catch (err: any) {
      this.isRunning = false;
      console.error('❌ [Telegram Bot] Botni ishga tushirishda xatolik:', err?.message || err);
    }
  }

  public async restart(): Promise<void> {
    console.log('🔄 [Telegram Bot] Bot qayta yuklanmoqda...');
    await this.stop();
    await this.start();
  }

  public async stop(): Promise<void> {
    if (this.bot) {
      try {
        if (this.usesPolling && this.isRunning) {
          await this.bot.stop();
          console.log('🛑 [Telegram Bot] Bot to\'xtatildi.');
        }
      } catch (err) {
        console.warn('⚠️ [Telegram Bot] To\'xtatishda xato:', err);
      } finally {
        this.isRunning = false;
        this.usesPolling = false;
        this.bot = null;
        this.webhookHandler = null;
      }
    }
  }

  public getWebhookHandler(): TelegramWebhookHandler | null {
    return this.webhookHandler;
  }

  public async sendToUser(telegramId: number | string, message: string): Promise<boolean> {
    if (!this.bot || !this.isRunning) return false;
    try {
      await this.bot.api.sendMessage(Number(telegramId), message, { parse_mode: 'HTML' });
      return true;
    } catch (err) {
      console.error(`[Telegram Bot] Send message to ${telegramId} failed:`, err);
      return false;
    }
  }

  public isUserAdmin(telegramId: number, session?: UserSessionState): boolean {
    if (session?.isAdmin) return true;
    const strId = String(telegramId);
    return strId === config.adminId;
  }

  private setupHandlers(bot: Bot): void {
    bot.catch(async (err) => {
      if (err.error instanceof GrammyError && err.error.error_code === 403) {
        console.info('[Telegram Bot] Xabar yuborilmadi: foydalanuvchi botni bloklagan yoki chat mavjud emas.');
        return;
      }
      if (err.error instanceof GrammyError && err.error.error_code === 429) {
        console.warn(
          `[Telegram Bot] Telegram so‘rovlarni vaqtincha chekladi; ${err.error.parameters.retry_after ?? 'keyinroq'} soniyadan so‘ng davom etiladi.`
        );
        return;
      }
      if (err.error instanceof HttpError) {
        console.warn('[Telegram Bot] Telegram API bilan tarmoq aloqasi uzildi; bot faoliyati davom etadi:', err.error.message);
        return;
      }

      console.error('[Telegram Bot Error]:', err.error);
      const ctx = err.ctx;
      if (ctx && ctx.chat) {
        const telegramId = ctx.from?.id;
        const session = telegramId ? this.getSession(telegramId) : undefined;
        if (
          telegramId &&
          (session?.state === 'chatting_with_ai_tutor' || session?.state === 'chatting_with_gemini')
        ) {
          try {
            await ctx.reply('AI Ustozda vaqtinchalik xatolik yuz berdi. Javobingiz yo‘qolmagan bo‘lishi mumkin; /resume yuboring yoki qayta urinib ko‘ring.');
          } catch (notifyError) {
            console.error('AI Ustozdagi xatolik haqida foydalanuvchiga xabar berilmadi:', notifyError);
          }
          return;
        }
        if (telegramId && session?.state === 'taking_test') {
          try {
            const lang = await I18nService.getUserLanguage(telegramId);
            await ctx.reply(
              lang === 'ru'
                ? 'Тест сохранён. Отправьте /resume, чтобы продолжить, или /cancel, чтобы отменить.'
                : lang === 'en'
                  ? 'Your test is saved. Send /resume to continue or /cancel to stop.'
                  : 'Testingiz saqlandi. Davom ettirish uchun /resume, bekor qilish uchun /cancel yuboring.'
            );
          } catch (notifyError) {
            console.error('Testdagi xatolik haqida foydalanuvchiga xabar berilmadi:', notifyError);
          }
          return;
        }
        // Talab 1: "Kechirasiz, vaqtincha nosozlik yuz berdi..." umumiy xato xabari foydalanuvchiga chiqmasin
      }
    });

    // 1. /start buyrug'i
    bot.command('start', async (ctx) => {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;
      if (ctx.chat.type !== 'private') {
        await ctx.reply('Botni ochish va guruh kodini kiritish uchun botga shaxsiy xabarda /start yuboring.');
        return;
      }

      const firstName = ctx.from?.first_name || '';
      const username = ctx.from?.username || '';

      await db.query(
        `INSERT INTO users (telegram_id, username, first_name, full_name, language_code, status, is_paid)
         VALUES ($1, $2, $3, $3, 'uz', 'active', FALSE)
         ON CONFLICT (telegram_id) DO UPDATE SET last_active = CURRENT_TIMESTAMP, first_name = EXCLUDED.first_name, username = EXCLUDED.username`,
        [telegramId, username, firstName]
      ).catch(() => {});

      let linkedGroup: { id: number; name: string } | null;
      try {
        linkedGroup = await this.getLinkedAcademyGroup(telegramId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn('[Academy Sync] O‘quvchi guruhini tekshirib bo‘lmadi:', message);
        await ctx.reply('Sayt bilan vaqtincha bog‘lanib bo‘lmadi. Iltimos, birozdan keyin /start ni qayta yuboring.');
        return;
      }

      this.clearSession(telegramId);
      if (linkedGroup) {
        const lang = await I18nService.getUserLanguage(telegramId);
        await ctx.reply(
          `Salom! Siz ${linkedGroup.name} guruhiga avvaldan bog‘langansiz.\n\n` +
          `Guruh kodini qayta kiritishingiz shart emas. Quyidagi menyudan davom eting:`,
          { reply_markup: await BotKeyboards.getMainMenu(lang) }
        );
        return;
      }

      this.getSession(telegramId).state = 'waiting_group_code';
      await ctx.reply(
        'Xush kelibsiz! Sizni bu yerda ko‘rishdan xursandmiz.\n\n' +
        'Sizga berilgan guruhga kirish kodini kiriting va botdan foydalanishda davom eting.'
      );
    });

    bot.command('review', async (ctx) => {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;
      if (ctx.chat.type !== 'private') {
        await ctx.reply('Sharh yuborish uchun botga shaxsiy xabarda /review yuboring.');
        return;
      }
      const session = this.getSession(telegramId);
      session.state = 'waiting_review_text';
      const lang = await I18nService.getUserLanguage(telegramId);
      const prompts: Record<string, string> = {
        uz: '✍️ Kurs haqidagi fikringizni bitta xabar qilib yuboring. Admin tasdiqlagandan keyin saytda ko‘rinadi. Bekor qilish uchun /cancel yozing.',
        ru: '✍️ Отправьте одним сообщением отзыв о курсе. Он появится на сайте после одобрения администратора. Для отмены отправьте /cancel.',
        en: '✍️ Send your course review in one message. It will appear on the website after admin approval. Send /cancel to cancel.',
      };
      await ctx.reply(prompts[lang] || prompts.uz);
    });

    // 2. /admin buyrug'i (Parol so'raydi, so'ngra qulay boshqaruv panelini ochadi)
    bot.command('admin', async (ctx) => {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;
      await this.handleAdminCommand(ctx, telegramId);
    });

    // 3. Til tanlash callback
    bot.callbackQuery(/^set_lang:(.+)$/, async (ctx) => {
      const telegramId = ctx.from.id;
      const langCode = ctx.match[1];
      const membership = await db.query(
        'SELECT academy_group_id FROM users WHERE telegram_id = $1',
        [telegramId]
      );
      if (!membership.rows[0]?.academy_group_id) {
        this.getSession(telegramId).state = 'waiting_group_code';
        await ctx.answerCallbackQuery().catch(() => { });
        await ctx.reply('Botdan foydalanish uchun sizga berilgan guruhga kirish kodini kiriting.');
        return;
      }

      await I18nService.setUserLanguage(telegramId, langCode);
      await ctx.answerCallbackQuery({ text: '✅ Saqlandi' }).catch(() => { });

      let welcomeText = '';
      if (langCode === 'ru') {
        welcomeText =
          `🌟 <b>Здравствуйте!</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `Добро пожаловать в официальный учебный бот Академии арабского языка <b>Aisha Uzbikiyya</b>.\n\n` +
          `📖 В меню доступны ежедневные тесты, статистика и AI Учитель по загруженным книгам.\n\n` +
          `<i>Выберите нужный раздел в меню ниже:</i>`;
      } else if (langCode === 'en') {
        welcomeText =
          `🌟 <b>Welcome!</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `Welcome to the official learning bot of the <b>Aisha Uzbikiyya</b> Arabic Academy.\n\n` +
          `📖 Use the menu below for daily quizzes, statistics, and an AI Tutor based on uploaded books.\n\n` +
          `<i>Please select an option from the menu below:</i>`;
      } else {
        welcomeText =
          `🌟 <b>Xush kelibsiz!</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `<b>Uzbikiyya akademiyasi o'quvchilari bilan ishlash guruhi.</b>\n\n` +
          `📖 Menyuda kunlik testlar, statistika va yuklangan kitoblar asosida ishlaydigan AI Ustoz mavjud.\n\n` +
          `<i>Kerakli bo'limni quyidagi menyudan tanlang:</i>`;
      }

      const mainKb = await BotKeyboards.getMainMenu(langCode);
      await ctx.reply(welcomeText, { parse_mode: 'HTML', reply_markup: mainKb });
    });

    // 4. "Kursga yozilish" callback (eski tugmalar bosilganda)
    bot.callbackQuery('action_enroll', async (ctx) => {
      await ctx.answerCallbackQuery().catch(() => { });
      const telegramId = ctx.from.id;
      const lang = await I18nService.getUserLanguage(telegramId);
      const mainKb = await BotKeyboards.getMainMenu(lang);
      await ctx.reply(
        lang === 'ru'
          ? "Вы уже являетесь учеником академии. Используйте главное меню:"
          : lang === 'en'
            ? "You are already enrolled. Please use the main menu:"
            : "Siz allaqachon akademiya o'quvchisiz. Asosiy menyudan foydalaning:",
        { reply_markup: mainKb }
      );
    });

    // Eski guruh tugmasi bosilsa ham saytdagi yagona guruh kodi so'raladi.
    bot.callbackQuery(/^join_group:(\d+)$/, async (ctx) => {
      const telegramId = ctx.from.id;
      const lang = await I18nService.getUserLanguage(telegramId);
      await ctx.answerCallbackQuery().catch(() => { });
      await this.handleGroupsList(ctx, telegramId, lang);
    });

    // 6. Statistika: Bitta tugma bilan ochib-yopish callback (⬇️ / ⬆️)
    bot.callbackQuery(/^toggle_stats:(open|close)$/, async (ctx) => {
      const telegramId = ctx.from.id;
      const action = ctx.match[1]; // 'open' or 'close'
      const lang = await I18nService.getUserLanguage(telegramId);

      await ctx.answerCallbackQuery().catch(() => { });
      await this.renderAllGroupsStatsCard(ctx, telegramId, lang, action === 'open', true);
    });

    bot.callbackQuery(/^tutor_book:(\d+)$/, async (ctx) => {
      const telegramId = ctx.from.id;
      const lang = await I18nService.getUserLanguage(telegramId);

      const session = this.getSession(telegramId);
      if (
        session.state !== 'selecting_ai_tutor_book' ||
        session.activeTutorBookId !== Number(ctx.match[1])
      ) {
        await ctx.answerCallbackQuery({
          text: 'Kitob tanlash eskirgan. AI Ustoz bo‘limini qayta oching.',
          show_alert: true,
        }).catch(() => { });
        return;
      }
      if (session.isGeneratingTutorQuestion || session.activeTutorQuestion) {
        await ctx.answerCallbackQuery({
          text: session.isGeneratingTutorQuestion
            ? 'Savol tayyorlanmoqda. Biroz kuting.'
            : 'AI Ustoz mashg‘uloti allaqachon boshlangan.',
          show_alert: true,
        }).catch(() => { });
        return;
      }
      await ctx.answerCallbackQuery().catch(() => { });
      session.isGeneratingTutorQuestion = true;
      let statusMessageId: number | undefined;

      try {
        const statusMessage = await ctx.reply('⏳ Kitobingiz asosida yozma topshiriq tayyorlanmoqda...');
        statusMessageId = statusMessage.message_id;
        await ctx.replyWithChatAction('typing').catch(() => { });
        const membership = await db.query(
          'SELECT academy_group_id, academy_group_name FROM users WHERE telegram_id = $1',
          [telegramId]
        );
        const groupId = Number(membership.rows[0]?.academy_group_id);
        if (!Number.isSafeInteger(groupId) || groupId <= 0) {
          throw new Error('Foydalanuvchining faol guruhi topilmadi');
        }
        const book = await getAcademyGroupBook(
          groupId,
          telegramId
        );
        if (book.id !== Number(ctx.match[1])) {
          throw new Error('Guruhingizga biriktirilgan kitob o‘zgargan');
        }
        session.state = 'chatting_with_ai_tutor';
        session.activeTutorBookId = Number(ctx.match[1]);
        session.activeTutorGroupId = groupId;
        session.activeTutorBookTitle = book.title;
        session.activeTutorLevel = normalizeCefrLevel(membership.rows[0]?.academy_group_name);
        const bookContent = book.text.slice(0, 16000);
        session.activeTutorBookContent = bookContent;
        const excludedTasks = await this.getRecentBookQuestions(telegramId, groupId);
        const task = await GeminiService.generateBookWritingTask(
          bookContent,
          lang,
          session.activeTutorLevel,
          1,
          undefined,
          excludedTasks
        );
        session.activeTutorQuestion = task;
        session.activeTutorQuestionCount = 1;
        session.activeTutorFeedback = undefined;
        session.activeTutorQuestionDelivered = false;
        await this.saveTutorQuestion(telegramId, groupId, book.id, task);
        const taskText = this.formatWritingTask(task, session.activeTutorLevel, 1, lang);
        const keyboard = {
            reply_markup: BotKeyboards.getAITutorExitKeyboard(lang),
        };
        try {
          await ctx.api.editMessageText(ctx.chat!.id, statusMessageId, taskText, keyboard);
        } catch (editError) {
          console.warn('[AI Tutor] Tayyor topshiriq kutish xabariga joylanmadi:', editError);
          await ctx.reply(taskText, keyboard);
        }
        session.activeTutorQuestionDelivered = true;
      } catch (error: any) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[AI Tutor] Sayt kitobidan savol yaratib bo‘lmadi:', message);
        session.state = 'selecting_ai_tutor_book';
        session.activeTutorQuestion = undefined;
        session.activeTutorQuestionDelivered = false;
        const errorText = lang === 'ru'
          ? 'Не удалось подготовить задание. Нажмите кнопку книги ниже, чтобы попробовать ещё раз.'
          : lang === 'en'
            ? 'Could not prepare the task. Tap the book button below to retry.'
            : 'Topshiriq tayyorlanmadi. Qayta urinish uchun quyidagi kitob tugmasini bosing.';
        const keyboard = {
          reply_markup: BotKeyboards.getTutorBooksKeyboard(
            [{ id: session.activeTutorBookId || Number(ctx.match[1]), title: session.activeTutorBookTitle || 'Kitob' }],
            lang
          ),
        };
        if (statusMessageId && ctx.chat) {
          try {
            await ctx.api.editMessageText(ctx.chat.id, statusMessageId, errorText, keyboard);
          } catch (editError) {
            console.warn('[AI Tutor] Xato holatini kutish xabariga ko‘rsatib bo‘lmadi:', editError);
            await ctx.reply(errorText, keyboard);
          }
        } else {
          await ctx.reply(errorText, keyboard);
        }
      } finally {
        session.isGeneratingTutorQuestion = false;
      }
    });

    // 7. Admin panel inline tugmalari
    bot.callbackQuery(/^admin_view:(stats|groups|students|tests|refresh)$/, async (ctx) => {
      const telegramId = ctx.from.id;
      if (!this.isUserAdmin(telegramId)) {
        await ctx.answerCallbackQuery({ text: '⛔️ Sizda administrator huquqi yo\'q', show_alert: true }).catch(() => { });
        return;
      }

      await ctx.answerCallbackQuery().catch(() => { });
      const adminUrl = this.getAcademyAdminUrl();
      await ctx.reply(adminUrl ? `🌐 Yagona admin panel: ${adminUrl}` : 'Sayt admin paneli havolasi sozlanmagan.');
    });

    // 8. AI Ustoz rejimini yopish callback
    bot.callbackQuery(/^(exit_gemini|exit_ai_tutor)$/, async (ctx) => {
      const telegramId = ctx.from.id;
      this.clearSession(telegramId);
      await ctx.answerCallbackQuery({ text: 'AI Ustoz rejimidan chiqildi' }).catch(() => { });
      const lang = await I18nService.getUserLanguage(telegramId);
      await ctx.reply("Asosiy menyuga qaytdingiz:", { reply_markup: await BotKeyboards.getMainMenu(lang) });
    });

    // 9. Test javoblari callback
    bot.callbackQuery(/^quiz_answer:([a-f0-9]{8}):(\d+)$/, async (ctx) => {
      const telegramId = ctx.from.id;
      const questionToken = ctx.match[1];
      const selectedIndex = Number(ctx.match[2]);
      const session = this.getSession(telegramId);

      if (
        session.state !== 'taking_test' ||
        !session.testQuestions ||
        session.testQuestionToken !== questionToken
      ) {
        await ctx.answerCallbackQuery({
          text: 'Bu savol eskirgan. Joriy test savoliga javob bering.',
          show_alert: true,
        }).catch(() => { });
        return;
      }
      if (session.isProcessingQuizAnswer || session.isFinishingQuiz) {
        await ctx.answerCallbackQuery({ text: 'Javobingiz tekshirilmoqda.' }).catch(() => { });
        return;
      }

      const currentIdx = session.testCurrentIndex ?? 0;
      const question = session.testQuestions[currentIdx];
      if (
        !question ||
        !Number.isInteger(selectedIndex) ||
        selectedIndex < 0 ||
        selectedIndex >= question.options.length
      ) {
        await ctx.answerCallbackQuery({
          text: 'Javob varianti noto‘g‘ri. Iltimos, qaytadan urinib ko‘ring.',
          show_alert: true,
        }).catch(() => { });
        return;
      }

      session.isProcessingQuizAnswer = true;
      try {
        const lang = await I18nService.getUserLanguage(telegramId);
        const isCorrect = selectedIndex === question.correctIndex;
        await ctx.answerCallbackQuery({
          text: isCorrect ? '✅ To‘g‘ri!' : '❌ Noto‘g‘ri',
        }).catch(() => { });
        if (isCorrect) session.testScore = (session.testScore || 0) + 1;

        const topicName = question.topic || 'Arab tili';
        const userAnswerText = question.options[selectedIndex];
        const correctAnswerText = question.options[question.correctIndex];

        session.testAttempts = session.testAttempts || [];
        session.testAttempts.push({
          question: question.question,
          topic: topicName,
          options: question.options,
          selectedIndex,
          correctIndex: question.correctIndex,
          isCorrect,
          userAnswerText,
          correctAnswerText,
          explanation: question.explanation || '',
        });

        try {
          await db.query(
            `INSERT INTO user_quiz_history
             (telegram_id, academy_group_id, question, topic, is_correct, user_answer, correct_answer, explanation)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              telegramId,
              session.testAcademyGroupId,
              question.question,
              topicName,
              isCorrect,
              userAnswerText,
              correctAnswerText,
              question.explanation || '',
            ]
          );
        } catch (dbErr) {
          console.warn('user_quiz_history insert error:', dbErr);
        }

        try {
          const groupId = session.testAcademyGroupId;
          if (!groupId) throw new Error('Test sessiyasida guruh aniqlanmagan');
          await db.query(
            `INSERT INTO academy_group_topic_stats
             (telegram_id, academy_group_id, topic, correct_count, wrong_count)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (telegram_id, academy_group_id, topic) DO UPDATE SET
               correct_count = academy_group_topic_stats.correct_count + EXCLUDED.correct_count,
               wrong_count = academy_group_topic_stats.wrong_count + EXCLUDED.wrong_count,
               updated_at = CURRENT_TIMESTAMP`,
            [telegramId, groupId, topicName, isCorrect ? 1 : 0, isCorrect ? 0 : 1]
          );
        } catch (e) {
          console.warn('academy_group_topic_stats update error:', e);
        }

        session.testCurrentIndex = currentIdx + 1;
        if (session.testCurrentIndex < session.testQuestions.length) {
          await this.sendNextQuizQuestion(ctx, session);
        } else {
          await this.finishQuiz(ctx, telegramId, session, lang);
        }
      } finally {
        session.isProcessingQuizAnswer = false;
      }
    });

    // 9.1. Test xatolarini bitta tugma bilan ochish / yopish callback (editMessageText orqali)
    bot.callbackQuery(/^toggle_quiz_review:(open|close)$/, async (ctx) => {
      const telegramId = ctx.from.id;
      const action = ctx.match[1];
      const session = this.getSession(telegramId);
      const lang = await I18nService.getUserLanguage(telegramId);

      await ctx.answerCallbackQuery().catch(() => { });
      const isOpen = action === 'open';
      const text = this.renderQuizSummaryText(session, isOpen, lang);
      const kb = BotKeyboards.getQuizReviewKeyboard(isOpen, lang);

      try {
        await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
      } catch (err) {
        console.warn('Quiz review toggle error:', err);
      }
    });


    // 10. Barcha matnli xabarlar
    bot.on('message:text', async (ctx) => {
      const telegramId = ctx.from.id;
      const text = ctx.message.text.trim();
      const session = this.getSession(telegramId);
      const lang = await I18nService.getUserLanguage(telegramId);

      if (text.toLowerCase() === '/cancel' && session.state === 'taking_test') {
        this.clearSession(telegramId);
        await ctx.reply('Test bekor qilindi. Yangi testni asosiy menyudan boshlashingiz mumkin.', {
          reply_markup: await BotKeyboards.getMainMenu(lang),
        });
        return;
      }
      if (text.toLowerCase() === '/resume' && session.state === 'taking_test') {
        if (session.isProcessingQuizAnswer || session.isFinishingQuiz) {
          await ctx.reply('Javobingiz tekshirilmoqda. Biroz kutib qayta urinib ko‘ring.');
          return;
        }
        await this.sendNextQuizQuestion(ctx, session);
        return;
      }
      if (
        text.toLowerCase() === '/resume' &&
        (session.state === 'chatting_with_ai_tutor' || session.state === 'chatting_with_gemini') &&
        session.activeTutorAnswerAccepted
      ) {
        await this.handleAITutorUserMessage(ctx, telegramId, text, lang);
        return;
      }
      if (
        text.toLowerCase() === '/cancel' &&
        (session.state === 'selecting_ai_tutor_book' ||
          session.state === 'chatting_with_ai_tutor' ||
          session.state === 'chatting_with_gemini')
      ) {
        this.clearSession(telegramId);
        await ctx.reply('AI Ustoz mashg‘uloti bekor qilindi.', {
          reply_markup: await BotKeyboards.getMainMenu(lang),
        });
        return;
      }

      if (session.state === 'waiting_review_text') {
        if (ctx.chat.type !== 'private') {
          await ctx.reply('Sharhni bot bilan shaxsiy chatda yuboring.');
          return;
        }
        if (text.toLowerCase() === '/cancel') {
          session.state = 'idle';
          await ctx.reply(lang === 'ru' ? 'Отправка отзыва отменена.' : lang === 'en' ? 'Review submission cancelled.' : 'Sharh yuborish bekor qilindi.');
          return;
        }
        if (text.length > 2000) {
          await ctx.reply(lang === 'ru' ? 'Отзыв должен быть не длиннее 2000 символов.' : lang === 'en' ? 'The review must be 2,000 characters or fewer.' : 'Sharh 2000 belgidan oshmasligi kerak.');
          return;
        }

        try {
          const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'Telegram o‘quvchi';
          await submitAcademyReview(telegramId, name, text);
          session.state = 'idle';
          await ctx.reply(
            lang === 'ru'
              ? '✅ Спасибо! Отзыв отправлен администратору на проверку.'
              : lang === 'en'
                ? '✅ Thank you! Your review has been sent to the admin for approval.'
                : '✅ Rahmat! Sharhingiz admin tasdig‘iga yuborildi.'
          );
        } catch (error: any) {
          console.error('[Academy Sync] Sharhni saytga yuborib bo‘lmadi:', error.message);
          session.state = 'idle';
          await ctx.reply(
            lang === 'ru'
              ? '❌ Не удалось отправить отзыв. Попробуйте позже.'
              : lang === 'en'
                ? '❌ Could not send the review. Please try again later.'
                : '❌ Sharh yuborilmadi. Keyinroq qayta urinib ko‘ring.'
          );
        }
        return;
      }

      // Agar guruh kodini kutayotgan bo'lsa
      if (session.state === 'waiting_group_code') {
        if (ctx.chat.type !== 'private') {
          await ctx.reply('Guruh kodini bot bilan shaxsiy chatda yuboring.');
          return;
        }
        if (!/^[a-f\d]{8}$/i.test(text)) {
          await this.replyInvalidAccessAttempt(ctx, telegramId);
          return;
        }
        await this.handleAcademyGroupCodeVerification(ctx, telegramId, text);
        return;
      }

      // Agar 3 xonali talaba raqamini kutayotgan bo'lsa
      if (session.state === 'waiting_student_code') {
        if (ctx.chat.type !== 'private') {
          await ctx.reply('Talaba raqamini shaxsiy chatda yuboring.');
          return;
        }
        if (text !== '0' && !/^\d{3}$/.test(text)) {
          await this.replyInvalidAccessAttempt(ctx, telegramId);
          return;
        }
        await this.handleStudentCodeVerification(ctx, telegramId, text, lang);
        return;
      }

      // Agar admin parolini kutayotgan bo'lsa
      if (session.state === 'waiting_admin_password') {
        if (ctx.chat.type !== 'private') {
          session.state = 'idle';
          await ctx.reply('Admin parolini faqat bot bilan shaxsiy chatda kiriting.');
          return;
        }
        if (text.toLowerCase() === '/cancel') {
          session.state = 'idle';
          await ctx.reply('Admin panelga kirish bekor qilindi.');
          return;
        }

        const enteredPass = text.trim();
        const now = Date.now();
        const failure = this.adminPasswordFailures.get(telegramId);
        if (failure && failure.lockedUntil > now) {
          const minutes = Math.ceil((failure.lockedUntil - now) / 60000);
          await ctx.reply(`Urinishlar vaqtincha bloklandi. ${minutes} daqiqadan so‘ng qayta urinib ko‘ring.`);
          return;
        }
        const expectedPass = config.adminPassword;
        const enteredBuffer = Buffer.from(enteredPass, 'utf8');
        const expectedBuffer = Buffer.from(expectedPass, 'utf8');
        const isValidPassword = expectedBuffer.length > 0
          && enteredBuffer.length === expectedBuffer.length
          && timingSafeEqual(enteredBuffer, expectedBuffer);

        if (isValidPassword) {
          this.adminPasswordFailures.delete(telegramId);
          session.isAdmin = true;
          session.state = 'idle';
          const adminUrl = this.getAcademyAdminUrl();
          await ctx.reply(
            `✅ <b>Muvaffaqiyatli tasdiqlandingiz!</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
            `👑 Sizga administrator huquqi berildi.\n\n` +
            `🌐 Sayt admin paneli havolasi:\n👉 ${escapeHtml(adminUrl)}`,
            { parse_mode: 'HTML' }
          );
        } else {
          const previousAttempts = failure?.lockedUntil && failure.lockedUntil <= now
            ? 0
            : failure?.attempts || 0;
          const attempts = previousAttempts + 1;
          this.adminPasswordFailures.set(telegramId, {
            attempts,
            lockedUntil: attempts >= 5 ? now + 15 * 60 * 1000 : 0,
          });
          if (this.adminPasswordFailures.size > 10000) {
            for (const [userId, state] of this.adminPasswordFailures) {
              if (!state.lockedUntil || state.lockedUntil <= now) {
                this.adminPasswordFailures.delete(userId);
              }
            }
          }
          await ctx.reply(
            attempts >= 5
              ? "❌ 5 marta noto'g'ri urinish. Kirish 15 daqiqaga bloklandi."
              : "❌ Noto'g'ri parol. Qaytadan urinib ko'ring yoki /cancel deb yozing."
          );
        }
        return;
      }

      const lower = text.toLowerCase();

      // 0. Admin panel menyu tugmasi yoki /admin
      if (text.includes('Admin Panel') || text.includes('Админ Панель') || lower === '/admin') {
        await this.handleAdminCommand(ctx, telegramId);
        return;
      }

      const membership = await db.query(
        'SELECT academy_group_id FROM users WHERE telegram_id = $1',
        [telegramId]
      );
      let linkedGroup = membership.rows[0]?.academy_group_id
        ? { id: Number(membership.rows[0].academy_group_id), name: '' }
        : null;
      if (!linkedGroup && config.academyApiUrl && config.academySyncSecret) {
        try {
          linkedGroup = await this.getLinkedAcademyGroup(telegramId);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn('[Academy Sync] O‘quvchi guruhini tekshirib bo‘lmadi:', message);
          await ctx.reply('Sayt bilan vaqtincha bog‘lanib bo‘lmadi. Keyinroq qayta urinib ko‘ring.');
          return;
        }
      }
      if (!linkedGroup) {
        session.state = 'waiting_group_code';
        await ctx.reply('Botdan foydalanish uchun sizga berilgan guruhga kirish kodini kiriting.');
        return;
      }

      // 1. Statistika va Umumiy Reyting menyusi (Barcha guruhlar, bitta tugma orqali ochilib-yopiladi)
      if (lower.includes('statistika') || lower.includes('статистика') || lower.includes('statistic') || lower.includes('reyting') || lower.includes('рейтинг')) {
        await this.renderAllGroupsStatsCard(ctx, telegramId, lang, false, false);
        return;
      }

      // 2. Guruhlar menyusi
      if (lower.includes('o\'quv guruh') || lower.includes('oquv guruh') || lower.includes('учебные групп') || lower.includes('study group') || lower === "👥 o'quv guruhlari") {
        await this.handleGroupsList(ctx, telegramId, lang);
        return;
      }

      // 3. Test menyusi (Band 2: Kuniga bir marta, admindan tashqari hammaga)
      if (lower.includes('test') || lower.includes('тест') || lower.includes('quiz')) {
        const isAdmin = this.isUserAdmin(telegramId);
        if (!isAdmin) {
          const testSettingsRes = await db.query('SELECT * FROM test_settings LIMIT 1');
          const settings = testSettingsRes.rows[0];
          const dailyLimit = settings && settings.test_daily_limit !== null ? Number(settings.test_daily_limit) : 1;

          if (dailyLimit > 0) {
            const today = getTashkentDate();
            const checkAttempt = await db.query(
              'SELECT COUNT(*) as count FROM daily_test_attempts WHERE telegram_id = $1 AND test_date = $2 AND academy_group_id = $3',
              [telegramId, today, membership.rows[0].academy_group_id]
            );
            const attemptCount = Number(checkAttempt.rows[0]?.count || 0);

            if (attemptCount >= dailyLimit) {
              const messages = {
                uz: 'Bugungi test limitingiz tugadi. Keyingi darsgacha xayr! 🌙\n\n⏳ Limit ertaga 00:00 da yangilanadi.',
                ru: 'Дневной лимит тестов на сегодня исчерпан. До следующего занятия! 🌙\n\n⏳ Лимит обновится завтра в 00:00.',
                en: 'You have reached today’s test limit. Goodbye until the next lesson! 🌙\n\n⏳ The limit resets tomorrow at 00:00.',
              };
              await ctx.reply(messages[lang as keyof typeof messages] || messages.uz);
              return;
            }
          }
        }

        await this.startQuiz(ctx, telegramId, lang, true);
        return;
      }

      // 4. AI Ustoz menyusi (Band 3 & 4: Nom "AI Ustoz", kitob nomi sir, ketma-ket dars)
      if (lower.includes('ai ustoz') || lower.includes('ии учитель') || lower.includes('ai tutor') || lower.includes('ustoz') || lower.includes('gemini')) {
        await this.handleAITutorStart(ctx, telegramId, lang);
        return;
      }

      // 5. Sharh qoldirish menyusi
      if (lower.includes('sharh') || lower.includes('отзыв') || lower.includes('review') || lower.includes('fikr')) {
        session.state = 'waiting_review_text';
        const prompts: Record<string, string> = {
          uz: '✍️ <b>Kurs va ustozlar haqidagi fikr yoki sharhingizni yozing:</b>\n\nSharhingiz administrator tasdig‘idan so‘ng saytda e’lon qilinadi.\n<i>(Bekor qilish uchun /cancel deb yozing)</i>',
          ru: '✍️ <b>Напишите ваш отзыв о курсе и преподавателях:</b>\n\nВаш отзыв появится на сайте после одобрения администратором.\n<i>(Для отмены отправьте /cancel)</i>',
          en: '✍️ <b>Write your review about the course and teachers:</b>\n\nYour review will be posted on the website after admin approval.\n<i>(Send /cancel to cancel)</i>',
        };
        await ctx.reply(prompts[lang] || prompts.uz, { parse_mode: 'HTML' });
        return;
      }

      // 6. Aloqa / Yordam menyusi (Admin Telegram shaxsiy chatiga to'g'ridan-to'g'ri o'tish)
      if (lower.includes('aloqa') || lower.includes('yordam') || lower.includes('admin bilan bog\'lanish') || lower.includes('связь') || lower.includes('поддержк') || lower.includes('contact')) {
        await this.handleSupportInfo(ctx, lang);
        return;
      }

      // 7. Agar foydalanuvchi AI Ustoz suhbat / dars rejimida bo'lsa
      if (session.state === 'chatting_with_ai_tutor' || session.state === 'chatting_with_gemini') {
        await this.handleAITutorUserMessage(ctx, telegramId, text, lang);
        return;
      }


      // Noma'lum xabar holatida menyuni chiqarish (Admin tugmasi yashirin)
      await ctx.reply(
        "Iltimos, quyidagi asosiy menyu tugmalaridan foydalaning:",
        { reply_markup: await BotKeyboards.getMainMenu(lang) }
      );
    });

    bot.on('callback_query:data', async (ctx) => {
      await ctx.answerCallbackQuery({
        text: 'Bu tugma eskirgan yoki noto‘g‘ri bosildi. Menyudan kerakli bo‘limni qayta tanlang.',
        show_alert: true,
      }).catch(() => { });
    });

  }

  /**
   * Admin panel ochish (/admin buyrug'i va menyu tugmasi uchun)
   */
  private async handleAdminCommand(ctx: Context, telegramId: number): Promise<void> {
    const session = this.getSession(telegramId);
    if (!this.isUserAdmin(telegramId, session)) {
      if (ctx.chat?.type !== 'private') {
        await ctx.reply('Admin panelga kirish uchun bot bilan shaxsiy chatdan foydalaning.');
        return;
      }
      if (!config.adminPassword) {
        await ctx.reply('Admin paroli sozlanmagan. ADMIN_PASSWORD ni bot sozlamalarida kiriting.');
        return;
      }
      session.state = 'waiting_admin_password';
      await ctx.reply(
        "🔐 <b>Administrator Paneli</b>\n━━━━━━━━━━━━━━━━━━━━\n" +
        "Iltimos, administrator parolini kiriting:\n\n" +
        "<i>(Bekor qilish uchun /cancel deb yozing)</i>",
        { parse_mode: 'HTML' }
      );
      return;
    }
    const adminUrl = this.getAcademyAdminUrl();
    await ctx.reply(
      `👑 <b>Administrator Paneli</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
      `🌐 Sayt admin paneli havolasi:\n👉 <b>${adminUrl}</b>\n\n` +
      `💡 Bu yerda siz barcha guruhlar, o'quvchilar, baholar, sharhlar va statistikalarni to'liq boshqara olasiz.`,
      { parse_mode: 'HTML' }
    );
  }

  private getAcademyAdminUrl(): string {
    return config.academyAdminUrl || (config.academyApiUrl ? `${config.academyApiUrl}/admin` : '');
  }

  private async getLinkedAcademyGroup(telegramId: number): Promise<{ id: number; name: string } | null> {
    const localMembership = await db.query(
      'SELECT academy_group_id, academy_group_name FROM users WHERE telegram_id = $1',
      [telegramId]
    );
    const localGroupId = Number(localMembership.rows[0]?.academy_group_id);
    if (Number.isSafeInteger(localGroupId) && localGroupId > 0) {
      return {
        id: localGroupId,
        name: localMembership.rows[0].academy_group_name || 'Guruh',
      };
    }

    if (!config.academyApiUrl || !config.academySyncSecret) return null;
    const membership = await getAcademyStudentMembership(telegramId);
    if (!membership) return null;

    await db.query(
      `UPDATE users
       SET academy_group_id = $1, academy_group_name = $2, student_code = $3
       WHERE telegram_id = $4`,
      [membership.group.id, membership.group.name, membership.studentCode, telegramId]
    );
    return membership.group;
  }

  private async handleAcademyGroupCodeVerification(
    ctx: Context,
    telegramId: number,
    enteredCode: string
  ): Promise<void> {
    try {
      const firstName = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ') || 'Telegram o‘quvchi';
      const cleanCode = enteredCode.trim().toUpperCase();
      const access = await verifyAcademyGroupCode(cleanCode, telegramId, firstName, '', true);

      const session = this.getSession(telegramId);
      session.tempGroupCode = cleanCode;
      session.tempGroupName = access.group.name;
      session.tempGroupBook = access.book;
      session.state = 'waiting_student_code';

      await ctx.reply(
        `✅ <b>${access.group.name}</b> guruhi muvaffaqiyatli topildi!\n━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Endi admin panelda siz uchun ajratilgan <b>3 xonali talaba raqamingizni</b> kiriting.\n\n` +
        `<i>Agar sizga hali talaba raqami berilmagan bo'lsa yoki bilmasangiz, <b>0</b> deb yuboring.</i>`,
        { parse_mode: 'HTML' }
      );
    } catch (error: any) {
      console.warn('[Academy Sync] Guruh kodini tasdiqlab bo‘lmadi:', error.message);
      const msg = error.message || '';
      if (msg.includes('noto‘g‘ri') || msg.includes('topilmadi')) {
        await this.replyInvalidAccessAttempt(ctx, telegramId);
      } else {
        await ctx.reply('Sayt bilan vaqtincha bog‘lanib bo‘lmadi. Iltimos, birozdan keyin qayta urinib ko‘ring.');
      }
    }
  }

  private async replyInvalidAccessAttempt(ctx: Context, telegramId: number): Promise<void> {
    const now = Date.now();
    const lastReplyAt = this.lastInvalidAttemptAt.get(telegramId) || 0;
    if (now - lastReplyAt < 5000) return;

    this.lastInvalidAttemptAt.set(telegramId, now);
    if (this.lastInvalidAttemptAt.size > 10000) {
      for (const [userId, timestamp] of this.lastInvalidAttemptAt) {
        if (now - timestamp >= 5000) this.lastInvalidAttemptAt.delete(userId);
      }
    }

    await ctx.reply('Noto‘g‘ri urinish. Iltimos, qayta urinmang. Admin bilan bog‘lanib, kodingizni aniqlab oling.');
  }

  private async handleStudentCodeVerification(
    ctx: Context,
    telegramId: number,
    codeText: string,
    lang: string
  ): Promise<void> {
    const session = this.getSession(telegramId);
    const groupCode = session.tempGroupCode || '';
    const studentCode = codeText.trim() === '0' ? '' : codeText.trim();
    const firstName = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ') || 'Telegram o‘quvchi';

    let access: AcademyGroupAccess;
    try {
      access = await verifyAcademyGroupCode(groupCode, telegramId, firstName, studentCode);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[Academy Sync] Talaba raqamini tasdiqlab bo‘lmadi:', message);
      if (message.includes('topilmadi')) {
        await this.replyInvalidAccessAttempt(ctx, telegramId);
      } else {
        await ctx.reply('Sayt bilan vaqtincha bog‘lanib bo‘lmadi. Iltimos, birozdan keyin qayta urinib ko‘ring.');
      }
      return;
    }

    session.state = 'idle';
    try {
      await db.query(
        `UPDATE users
         SET academy_group_id = $1, academy_group_name = $2, student_code = COALESCE($3, student_code)
         WHERE telegram_id = $4`,
        [access.group.id, access.group.name, studentCode || null, telegramId]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[Bot DB] Saytda tasdiqlangan o‘quvchini lokal keshga saqlab bo‘lmadi:', message);
    }

    const studentName = access.student?.full_name || firstName;
    const codeInfo = access.student?.student_code ? `\n🔢 Talaba raqamingiz: <b>#${access.student.student_code}</b>` : '';
    const bookMessage = access.book
      ? `\n📖 Guruh kitobi: <b>${escapeHtml(access.book.title)}</b>`
      : '\n⚠️ Guruhga hali kitob biriktirilmagan.';

    await ctx.reply(
      `✅ <b>${escapeHtml(access.group.name)}</b> guruhiga muvaffaqiyatli bog'landingiz!\n` +
      `👤 O'quvchi: <b>${escapeHtml(studentName)}</b>${codeInfo}${bookMessage}\n\n` +
      `📊 Quyida talabalar statistikasi va umumiy reyting:`,
      { parse_mode: 'HTML', reply_markup: await BotKeyboards.getMainMenu(lang) }
    );

    await this.renderAllGroupsStatsCard(ctx, telegramId, lang, true, false);

    // 2 soniyadan so'ng tanlangan o'quvchi kartasi
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await this.renderPersonalStudentCard(ctx, telegramId, access.group.id, access.group.name);
  }

  private async handleGroupsList(ctx: Context, telegramId: number, lang: string): Promise<void> {
    let linkedGroup: { id: number; name: string } | null;
    try {
      linkedGroup = await this.getLinkedAcademyGroup(telegramId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[Academy Sync] O‘quvchi guruhini tekshirib bo‘lmadi:', message);
      await ctx.reply('Sayt bilan vaqtincha bog‘lanib bo‘lmadi. Keyinroq qayta urinib ko‘ring.');
      return;
    }

    if (linkedGroup) {
      this.getSession(telegramId).state = 'idle';
      await ctx.reply(
        `Siz ${linkedGroup.name} guruhiga bog‘langansiz. Guruh kodini qayta kiritish shart emas.`,
        { reply_markup: await BotKeyboards.getMainMenu(lang) }
      );
      return;
    }

    this.getSession(telegramId).state = 'waiting_group_code';
    await ctx.reply(lang === 'ru'
      ? 'Введите код группы из панели сайта:'
      : lang === 'en'
        ? 'Enter the group code from the website admin panel:'
        : 'Botdan foydalanish uchun sizga berilgan guruhga kirish kodini kiriting.');
  }

  /**
   * BARCHA GURUHLAR STATISTIKASI VA REYTINGI
   * Guruh tanlash olib tashlangan — butun maktab bitta reytingda ko'rsatiladi.
   * Bitta ⬇️ / ⬆️ tugmasi bilan ochilib-yopiladi, bot chati to'lib ketmaydi!
   */
    private async renderPersonalStudentCard(
    ctx: Context,
    telegramId: number,
    groupId: number,
    groupName: string
  ): Promise<void> {
    try {
      const stats = await getAcademyStudentStats(telegramId);
      const targetGroup = stats.groups.find((g) => g.groupId === groupId);

      let msg = `👤 <b>SIZNING O'QUVCHI KARTANGIZ</b>\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `🏫 Guruh: <b>${escapeHtml(groupName)}</b>\n`;
      if (targetGroup) {
        msg += `🏅 Guruhdagi o'rningiz: <b>${targetGroup.rank}-o'rin</b> (jami ${targetGroup.groupSize} ta o'quvchi)\n`;
        msg += `⭐ Joriy oy to'plagan ballingiz: <b>${targetGroup.monthPoints} ball</b>\n`;
        msg += `🌟 Barcha vaqtlardagi jami ball: <b>${targetGroup.totalPoints} ball</b>\n`;
        msg += `📊 O'rtacha baho: <b>${targetGroup.averageGrade ?? 'Hali baholanmagan'}</b>\n`;
        msg += `📝 Baholangan darslar soni: <b>${targetGroup.gradedLessons} ta</b>\n`;
      } else {
        msg += `ℹ️ <i>${escapeHtml(groupName)} guruhi bo‘yicha statistika topilmadi.</i>\n`;
      }
      msg += `\n🎯 <i>Darslarni faol o'zlashtiring va botdagi kunlik testlarni topshirib borishni unutmang!</i>`;

      await ctx.reply(msg, { parse_mode: 'HTML' });
    } catch (e: any) {
      console.warn('[PersonalCard] Shaxsiy kartani ko\'rsatishda xatolik:', e.message);
      await ctx.reply('Shaxsiy statistika hozircha yuklanmadi. Keyinroq qayta urinib ko‘ring.');
    }
  }

private async renderAllGroupsStatsCard(
    ctx: Context,
    telegramId: number,
    lang: string,
    isExpanded: boolean = false,
    isEdit: boolean = false
  ): Promise<void> {
    let academyStats;
    let academyStatsError = false;
    if (config.academyApiUrl && config.academySyncSecret) {
      try {
        academyStats = await getAcademyStudentStats(telegramId);
      } catch (error: any) {
        academyStatsError = true;
        console.warn('[Academy Sync] Sayt o‘quvchi statistikasini olib bo‘lmadi:', error.message);
      }
    }

    let report = `📊 <b>SAYTDAGI O'QUV STATISTIKASI</b>\n`;
    report += `━━━━━━━━━━━━━━━━━━━━\n`;
    if (academyStats?.monthKey) {
      report += `📅 Hisoblanayotgan oy: <b>${escapeHtml(academyStats.monthKey)}</b>\n`;
    }

    if (academyStatsError) {
      report += `⚠️ <i>Sayt statistikasi hozircha yuklanmadi. Keyinroq qayta urinib ko‘ring.</i>\n`;
    } else if (!config.academyApiUrl || !config.academySyncSecret) {
      report += `⚠️ <i>Sayt bilan sinxronlash sozlanmagan.</i>\n`;
    } else if (!academyStats?.groups.length) {
      report += `ℹ️ <i>Saytda sizning Telegram ID'ingiz bilan bog‘langan faol guruh va baholar topilmadi.</i>\n`;
    } else {
      for (const group of academyStats.groups) {
        const progressLabel = group.progressStatus === 'improved'
          ? `📈 +${group.progressDifference}`
          : group.progressStatus === 'declined'
            ? `📉 ${group.progressDifference}`
            : group.progressStatus === 'unchanged'
              ? '➡️ O‘zgarish yo‘q'
              : '⏳ Hali yetarli baho yo‘q';
        report += `🏫 <b>${escapeHtml(group.groupName)}</b>\n`;
        report += `🏆 O‘rningiz: <b>${group.rank}/${group.groupSize}</b>\n`;
        report += `⭐ Joriy oy ballari: <b>${group.monthPoints}</b> · jami ball: <b>${group.totalPoints}</b>\n`;
        report += `📝 Baholangan darslar: <b>${group.gradedLessons}</b> · o‘rtacha: <b>${group.averageGrade ?? '—'}</b>\n`;
        report += `${progressLabel} <i>(joriy oy darslarining birinchi va ikkinchi yarmidagi baholar taqqoslandi)</i>\n`;
        if (!group.hasCurrentMonthGrades) {
          report += `⚠️ <i>Joriy oy uchun hali baho qo‘yilmagan. O‘tgan oy baholari joriy oy hisobiga kirmaydi.</i>\n`;
        }
      }
    }

    if (isExpanded) {
      for (const group of academyStats?.groups || []) {
        report += `\n🏅 <b>${escapeHtml(group.groupName)} reytingi (top-10)</b>\n`;
        if (!group.leaderboard.length) {
          report += `<i>Saytda reyting ma'lumoti yo'q.</i>\n`;
          continue;
        }
        group.leaderboard.forEach((student) => {
          const medal = student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : student.rank === 3 ? '🥉' : `<b>#${student.rank}</b>`;
          const name = escapeHtml(student.fullName || 'O‘quvchi');
          const isMe = Number(student.telegramId) === Number(telegramId);
          report += `${medal} <b>${name}</b> — ⭐️ <b>${student.monthPoints} ball</b>${isMe ? ' 👈 (Siz)' : ''}\n`;
        });
      }
    } else {
      report += `\n💡 <i>Sayt guruhlaridagi reytingni ko'rish uchun pastdagi tugmani bosing:</i>`;
    }

    if (academyStats?.groups.length) {
      report += `\n\nℹ️ <i>Baholar darsda faolligingiz uyga vazifalarni bajarganingizga qarab qo‘yiladi. Bu haqida shikoyat qilishdan avval talablarga javob bering</i>`;
    }

    const kb = BotKeyboards.getStatsToggleKeyboard(isExpanded, lang);

    if (isEdit && ctx.chat) {
      try {
        await ctx.editMessageText(report, { parse_mode: 'HTML', reply_markup: kb });
        return;
      } catch (e) { }
    }

    await ctx.reply(report, { parse_mode: 'HTML', reply_markup: kb });
  }

  /**
   * Aloqa / Yordam bo'limi (Admin Telegram shaxsiy chatiga to'g'ridan-to'g'ri o'tish)
   */
  private async handleSupportInfo(ctx: Context, lang: string): Promise<void> {
    const adminUrl = this.getAdminTelegramUrl("Salom, arab tili kurslari bo'yicha savolim bor edi");
    const kb = BotKeyboards.getContactAdminKeyboard(adminUrl, lang, '💬 Admin Shaxsiy Chatiga Yozish');

    const msg =
      `💬 <b>Admin bilan Bog'lanish Markazi</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Arab tili kurslari va darslar bo'yicha savollaringiz uchun administratorga yozishingiz mumkin.\n\n` +
      `👇 Administrator bilan shaxsiy chatda bog'lanish uchun pastdagi tugmani bosing:`;

    await ctx.reply(msg, {
      parse_mode: 'HTML',
      reply_markup: kb,
    });
  }

  /**
   * Test boshlash (Band 1 & 5: Kitob va mavzular asosida qattiq test, umumiy xato xabarisiz)
   */
  private async startQuiz(ctx: Context, telegramId: number, lang: string, isDaily: boolean = true): Promise<void> {
    const session = this.getSession(telegramId);
    if (session.state === 'selecting_ai_tutor_book' || session.state === 'chatting_with_ai_tutor') {
      await ctx.reply('Avval AI Ustoz suhbatidan chiqing, keyin testni boshlashingiz mumkin.');
      return;
    }
    if (session.isStartingTest) {
      return;
    }
    if (session.state === 'taking_test') {
      await ctx.reply('Sizda tugallanmagan test bor. Avval joriy testni yakunlang.');
      return;
    }
    session.isStartingTest = true;
    let waitMessageId: number | undefined;
    try {
      const waitMsg = await ctx.reply("⏳ Guruhingiz kitobi asosida test tayyorlanmoqda...", { parse_mode: 'HTML' });
      waitMessageId = waitMsg.message_id;
      const userResult = await db.query(
        'SELECT academy_group_id, academy_group_name FROM users WHERE telegram_id = $1',
        [telegramId]
      );
      const groupId = Number(userResult.rows[0]?.academy_group_id);
      if (!Number.isSafeInteger(groupId) || groupId <= 0) {
        await ctx.api.editMessageText(ctx.chat!.id, waitMsg.message_id, 'Test uchun saytda guruhingizga kitob biriktirilmagan. Iltimos, admin bilan bog‘laning.');
        return;
      }

      const book = await getAcademyGroupBook(groupId, telegramId);
      const learningProgress = await this.getBookLearningProgress(
        telegramId,
        groupId,
        book.id,
        book.text
      );
      const focusTopic = learningProgress.topics[learningProgress.currentTopicIndex];
      if (!focusTopic) {
        throw new Error('Kitobning joriy mavzusi topilmadi');
      }
      const reviewTopicIndex = getReviewBookTopicIndex(
        learningProgress.currentTopicIndex,
        learningProgress.previousScore,
        learningProgress.previousTopicIndex
      );
      const reviewTopic = reviewTopicIndex === undefined
        ? undefined
        : learningProgress.topics[reviewTopicIndex];
      const excludedQuestions = await this.getRecentBookQuestions(telegramId, groupId);
      const groupLevel = normalizeCefrLevel(userResult.rows[0]?.academy_group_name);
      const questions = await GeminiService.generateHardTestQuestions({
        bookText: getBookTopicExcerpt(
          book.text,
          learningProgress.topics,
          learningProgress.currentTopicIndex,
          reviewTopicIndex
        ),
        focusTopic,
        reviewTopic,
        count: 10,
        excludedQuestions,
        lang,
        cefrLevel: groupLevel,
      });

      session.state = 'taking_test';
      session.testQuestions = questions;
      session.testAttempts = [];
      session.testCurrentIndex = 0;
      session.testScore = 0;
      session.isDailyTest = isDaily;
      session.testAcademyGroupId = groupId;
      session.testBookId = book.id;
      session.testBookTopics = learningProgress.topics;
      session.testBookTopicIndex = learningProgress.currentTopicIndex;
      session.testCefrLevel = groupLevel;

      await this.sendNextQuizQuestion(ctx, session, waitMsg.message_id);
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Kitob asosidagi testni tayyorlab bo‘lmadi:', message);
      if (session.state === 'taking_test') {
        session.state = 'idle';
        session.testQuestions = undefined;
        session.testAttempts = undefined;
        session.testCurrentIndex = 0;
        session.testScore = 0;
        session.testQuestionToken = undefined;
        session.testAcademyGroupId = undefined;
        session.isDailyTest = false;
        session.testBookId = undefined;
        session.testBookTopics = undefined;
        session.testBookTopicIndex = undefined;
        session.testCefrLevel = undefined;
      }
      if (waitMessageId && ctx.chat) {
        try {
          await ctx.api.editMessageText(
            ctx.chat.id,
            waitMessageId,
            'Kitob asosidagi testni tayyorlab bo‘lmadi. Kitob matni va Gemini API sozlamalarini tekshiring, so‘ng qayta urinib ko‘ring.'
          );
        } catch (editError) {
          console.warn('Test xato xabarini ko‘rsatib bo‘lmadi:', editError);
        }
      } else {
        await ctx.reply('Kitob asosidagi testni tayyorlab bo‘lmadi. Keyinroq qayta urinib ko‘ring.');
      }
    } finally {
      session.isStartingTest = false;
    }
  }

  private async sendNextQuizQuestion(
    ctx: Context,
    session: UserSessionState,
    editMessageId?: number
  ): Promise<void> {
    if (!session.testQuestions) {
      throw new Error('Test savollari sessiyada topilmadi');
    }

    const idx = session.testCurrentIndex ?? 0;
    const total = session.testQuestions.length;
    const q = session.testQuestions[idx];
    if (!q) {
      throw new Error(`Testning ${idx + 1}-savoli topilmadi`);
    }

    const token = randomBytes(4).toString('hex');
    session.testQuestionToken = token;
    const topicText = q.topic ? ` (Mavzu: <i>${escapeHtml(q.topic)}</i>)` : '';
    const title = `📝 <b>${idx + 1}-savol (jami ${total} ta):</b>${topicText}\n━━━━━━━━━━━━━━━━━━━━\n\n${escapeHtml(q.question)}`;
    const keyboard = BotKeyboards.createQuizKeyboard(q.options, token);

    if (editMessageId && ctx.chat) {
      try {
        await ctx.api.editMessageText(ctx.chat.id, editMessageId, title, {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
        return;
      } catch (err) {
        console.warn('Test savoli kutish xabariga joylanmadi:', err);
        throw err;
      }
    }

    await ctx.reply(title, { parse_mode: 'HTML', reply_markup: keyboard });
  }

  /**
   * Test xulosasi matnini shakllantirish (xatolar ochilgan yoki yopilgan holatda)
   */
  private renderQuizSummaryText(session: UserSessionState, isOpen: boolean, lang: string): string {
    const score = session.lastQuizScore || 0;
    const total = session.lastQuizTotal || 10;
    const wrong = total - score;
    const percentage = session.lastQuizPercentage || 0;
    const levelTitle = escapeHtml(session.lastQuizLevelTitle || "A1 Boshlang'ich Daraja");
    const comment = escapeHtml(session.lastQuizComment || "");

    let text =
      `🎉 <b>Test Yakunlandi!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `✅ <b>To'g'ri javoblar:</b> <b>${score} ta</b>\n` +
      `❌ <b>Xato javoblar:</b> <b>${wrong} ta</b>\n` +
      `🎯 <b>Aniqlangan darajangiz:</b> <b>${levelTitle}</b> (${percentage}%)\n`;

    if (comment) {
      text += `💡 <i>${comment}</i>\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━\n`;

    if (wrong === 0) {
      text += `\n👏 <b>Barakalla!</b> Barcha savollarga 100% to'g'ri javob berdingiz!`;
    } else if (isOpen) {
      text += `\n🔍 <b>Xato qilingan savollar va to'g'ri javoblari:</b>\n\n`;
      const wrongList = (session.lastQuizAttempts || []).filter((a) => !a.isCorrect);

      let detailsTruncated = false;
      for (const [idx, att] of wrongList.entries()) {
        const detail =
          `<b>${idx + 1}-savol:</b> ${escapeHtml(att.question)}\n` +
          `   ❌ <b>Sizning javobingiz:</b> <s>${escapeHtml(att.userAnswerText)}</s>\n` +
          `   ✅ <b>To'g'ri javob:</b> <b>${escapeHtml(att.correctAnswerText)}</b>\n` +
          (att.explanation ? `   💡 <i>Izoh:</i> ${escapeHtml(att.explanation)}\n` : '') +
          '\n';
        if (text.length + detail.length > 3800) {
          detailsTruncated = true;
          break;
        }
        text += detail;
      }
      if (detailsTruncated) {
        text += `<i>Qolgan xatolar Telegram xabar hajmi chegarasi sabab ko‘rsatilmagan.</i>\n`;
      }
      text += `━━━━━━━━━━━━━━━━━━━━`;
    } else {
      text += `\n💡 <i>Xato qilingan savollar va to'g'ri javoblarini ko'rish uchun pastdagi tugmani bosing:</i>`;
    }

    const dailyMessage = session.lastQuizIsDailyTest
      ? '\n\n🌙 Bugungi test limitingiz tugadi. Keyingi darsgacha xayr! Limit ertaga 00:00 da yangilanadi.'
      : '\n\n🌙 Test yakunlandi. Keyingi darsgacha xayr!';
    text += lang === 'ru'
      ? session.lastQuizIsDailyTest
        ? '\n\n🌙 Дневной лимит тестов на сегодня исчерпан. До следующего занятия! Лимит обновится завтра в 00:00.'
        : '\n\n🌙 Тест завершён. До следующего занятия!'
      : lang === 'en'
        ? session.lastQuizIsDailyTest
          ? '\n\n🌙 You have reached today’s test limit. Goodbye until the next lesson! The limit resets tomorrow at 00:00.'
          : '\n\n🌙 The test is complete. Goodbye until the next lesson!'
        : dailyMessage;

    return text;
  }

  private async finishQuiz(
    ctx: Context,
    telegramId: number,
    session: UserSessionState,
    lang: string
  ): Promise<void> {
    if (session.isFinishingQuiz) return;
    if (
      session.state !== 'taking_test' ||
      !session.testQuestions?.length ||
      (session.testAttempts?.length || 0) !== session.testQuestions.length
    ) {
      console.warn('Tugallanmagan testni yakunlash so‘rovi rad etildi:', {
        telegramId,
        answered: session.testAttempts?.length || 0,
        total: session.testQuestions?.length || 0,
      });
      return;
    }

    session.isFinishingQuiz = true;
    const score = session.testScore || 0;
    const total = session.testQuestions.length;
    const wrong = total - score;
    const percentage = Math.round((score / total) * 100);

    let level = 'A1';
    let levelTitle = "A1 Boshlang'ich Daraja";
    let comment = "Kitobdagi mavzularni qayta ko‘rib, zamonaviy arab tilidagi kundalik ibora va tuzilmalarni mashq qiling.";

    if (percentage >= 80) {
      level = 'B2';
      levelTitle = "B2 Yuqori Daraja";
      comment = "Ajoyib natija! Keyingi testda kitobning navbatdagi mavzusini, guruhingiz darajasida o‘rganamiz.";
    } else if (percentage >= 60) {
      level = 'B1';
      levelTitle = "B1 O'rta-Yuqori Daraja";
      comment = "Yaxshi natija! Kitobdagi grammatik tuzilmalar va matn mazmunini mustahkamlang.";
    } else if (percentage >= 40) {
      level = 'A2';
      levelTitle = "A2 O'rta Daraja";
      comment = "Kitobdagi asosiy matnlar, iboralar va lug‘atni qayta mashq qiling.";
    }

    level = capCefrLevel(level, session.testCefrLevel || 'A1');
    levelTitle = {
      A1: "A1 Boshlang'ich Daraja",
      A2: "A2 O'rta Daraja",
      B1: "B1 O'rta-Yuqori Daraja",
      B2: "B2 Yuqori Daraja",
      C1: "C1 Ilg'or Daraja",
      C2: "C2 Mukammal Daraja",
    }[level] || "A1 Boshlang'ich Daraja";

    // Natijani bazaga yozish (Band 1: Test xatosi bo'lsa ham hech qachon yiqilmasdan yakunlansin)
    try {
      const userRes = await db.query('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);
      const userId = userRes.rows[0]?.id;

      if (userId) {
        await db.query(
          `INSERT INTO user_tests (user_id, telegram_id, academy_group_id, score, total_questions, percentage, level, recommended_course)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [userId, telegramId, session.testAcademyGroupId, score, total, percentage, level, levelTitle]
        );
      }

      if (session.isDailyTest) {
        const today = getTashkentDate();
        await db.query(
          `INSERT INTO daily_test_attempts (telegram_id, academy_group_id, test_date, score, total)
           VALUES ($1, $2, $3, $4, $5)`,
          [telegramId, session.testAcademyGroupId, today, score, total]
        );
      }
    } catch (dbErr) {
      console.warn('⚠️ [finishQuiz db save error]:', dbErr);
    }

    if (
      session.testAcademyGroupId &&
      session.testBookId !== undefined &&
      session.testBookTopics?.length &&
      session.testBookTopicIndex !== undefined
    ) {
      try {
        await db.query(
          `INSERT INTO academy_book_learning_progress
           (telegram_id, academy_group_id, book_id, current_topic_index, previous_score, previous_topic_index, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
           ON CONFLICT (telegram_id, academy_group_id, book_id) DO UPDATE SET
             current_topic_index = EXCLUDED.current_topic_index,
             previous_score = EXCLUDED.previous_score,
             previous_topic_index = EXCLUDED.previous_topic_index,
             updated_at = CURRENT_TIMESTAMP`,
          [
            telegramId,
            session.testAcademyGroupId,
            session.testBookId,
            getNextBookTopicIndex(session.testBookTopicIndex, session.testBookTopics.length),
            percentage,
            session.testBookTopicIndex,
          ]
        );
      } catch (progressError) {
        console.warn('[Kitob testi] Mavzu progressini saqlab bo‘lmadi:', progressError);
      }
    }

    // Natijalarni sessiyada saqlash (bitta tugma orqali ochib-yopish uchun)
    session.lastQuizAttempts = session.testAttempts ? [...session.testAttempts] : [];
    session.lastQuizScore = score;
    session.lastQuizTotal = total;
    session.lastQuizPercentage = percentage;
    session.lastQuizLevelTitle = levelTitle;
    session.lastQuizComment = comment;
    session.lastQuizIsDailyTest = Boolean(session.isDailyTest);

    session.state = 'idle';
    session.testQuestions = undefined;
    session.testAttempts = undefined;
    session.testCurrentIndex = 0;
    session.testScore = 0;
    session.testQuestionToken = undefined;
    session.testBookId = undefined;
    session.testBookTopics = undefined;
    session.testBookTopicIndex = undefined;
    session.testCefrLevel = undefined;
    session.isFinishingQuiz = false;

    const summaryText = this.renderQuizSummaryText(session, false, lang);
    const kb = wrong > 0 ? BotKeyboards.getQuizReviewKeyboard(false, lang) : undefined;

    try {
      await ctx.reply(summaryText, {
        parse_mode: 'HTML',
        reply_markup: kb,
      });
    } catch (error) {
      console.error('Test natijasini foydalanuvchiga yuborib bo‘lmadi:', error);
    }
  }

  /** AI Ustoz uchun saytga yuklangan kitobni tanlash */
  private async handleAITutorStart(ctx: Context, telegramId: number, lang: string): Promise<void> {
    const session = this.getSession(telegramId);
    if (session.state === 'taking_test' || session.isStartingTest) {
      await ctx.reply('Avval testni yakunlang yoki /cancel bilan bekor qiling, keyin AI Ustozni boshlang.');
      return;
    }
    if (
      session.isStartingTutor ||
      session.state === 'selecting_ai_tutor_book' ||
      session.state === 'chatting_with_ai_tutor'
    ) {
      await ctx.reply(
        session.isStartingTutor
          ? '⏳ AI Ustoz ochilmoqda. Biroz kuting.'
          : session.state === 'selecting_ai_tutor_book'
            ? '📖 AI Ustoz uchun kitobni tanlash xabari yuqorida turibdi.'
            : '✍️ AI Ustoz mashg‘uloti davom etmoqda. Javobingizni yozing yoki chiqish tugmasini bosing.'
      );
      return;
    }
    session.isStartingTutor = true;
    let book;
    try {
      const membership = await db.query(
        'SELECT academy_group_id FROM users WHERE telegram_id = $1',
        [telegramId]
      );
      const groupId = Number(membership.rows[0]?.academy_group_id);
      if (!Number.isSafeInteger(groupId) || groupId <= 0) {
        session.isStartingTutor = false;
        await ctx.reply(
          lang === 'ru'
            ? 'Для вашей группы администратор ещё не назначил книгу.'
            : lang === 'en'
              ? 'Your group does not have an assigned book yet.'
              : 'Guruhingizga hali kitob biriktirilmagan. Admin bilan bog‘laning.'
        );
        return;
      }
      book = await getAcademyGroupBook(groupId, telegramId);
    } catch (error: any) {
      this.clearSession(telegramId);
      console.error('[AI Tutor] Guruh kitobini olib bo‘lmadi:', error.message);
      await ctx.reply(
        lang === 'ru'
          ? 'Не удалось получить список книг с сайта. Попробуйте позже.'
          : lang === 'en'
            ? 'Could not load the books from the website. Please try again later.'
            : 'Saytdagi kitoblar ro‘yxatini olib bo‘lmadi. Keyinroq qayta urinib ko‘ring.'
      );
      return;
    }
    if (!book) {
      session.isStartingTutor = false;
      return;
    }

    session.state = 'selecting_ai_tutor_book';
    session.activeTutorBookId = book.id;
    session.activeTutorBookTitle = book.title;
    session.activeTutorBookContent = book.text.slice(0, 16000);
    session.activeTutorQuestion = undefined;
    session.activeTutorQuestionCount = 0;
    session.isStartingTutor = false;
    const startText = lang === 'ru'
      ? `Начинаем письменную практику по книге «${escapeHtml(book.title)}».`
      : lang === 'en'
        ? `Your Arabic writing practice from "${escapeHtml(book.title)}" is ready.`
        : `<b>${escapeHtml(book.title)}</b> kitobi asosida arabcha yozuv mashqi boshlanmoqda.`;
    await ctx.reply(startText, {
      parse_mode: 'HTML',
      reply_markup: BotKeyboards.getTutorBooksKeyboard(
        [{ id: session.activeTutorBookId, title: book.title }],
        lang
      ),
    });
  }

  /**
   * AI Ustoz — O'quvchi javobini tekshirish va oldingi mavzulardan nazorat qilish
   */
  private async handleAITutorUserMessage(ctx: Context, telegramId: number, text: string, lang: string): Promise<void> {
    const session = this.getSession(telegramId);
    const exitKb = BotKeyboards.getAITutorExitKeyboard(lang);
    if (!session.activeTutorBookContent || !session.activeTutorQuestion) {
      this.clearSession(telegramId);
      await ctx.reply(
        lang === 'ru'
          ? 'Сначала выберите книгу в разделе «ИИ Учитель».'
          : lang === 'en'
            ? 'Please choose a book from AI Tutor first.'
            : 'Avval AI Ustoz bo‘limidan kitob tanlang.'
      );
      return;
    }
    if (text.length > 2000) {
      await ctx.reply('Javob 2000 belgidan oshmasin. Qisqaroq qilib yuboring.', {
        reply_markup: exitKb,
      });
      return;
    }
    if (session.isProcessingTutorAnswer) {
      await ctx.reply('⏳ Javobingiz tekshirilmoqda. Iltimos, tugaguncha kuting.', {
        reply_markup: exitKb,
      });
      return;
    }
    session.isProcessingTutorAnswer = true;

    await ctx.replyWithChatAction('typing').catch(() => { });
    try {
      if (!session.activeTutorQuestionDelivered) {
        await ctx.reply(
          this.formatWritingTask(
            session.activeTutorQuestion,
            session.activeTutorLevel || 'A1',
            session.activeTutorQuestionCount || 1,
            lang
          ),
          {
            reply_markup: exitKb,
          }
        );
        session.activeTutorQuestionDelivered = true;
        return;
      }

      const groupId = Number(session.activeTutorGroupId);
      const bookId = Number(session.activeTutorBookId);
      if (!Number.isSafeInteger(groupId) || groupId <= 0 || !Number.isSafeInteger(bookId) || bookId <= 0) {
        throw new Error('AI ustoz sessiyasi uchun guruh yoki kitob aniqlanmadi');
      }
      let feedback = session.activeTutorFeedback || '';
      if (!session.activeTutorAnswerAccepted) {
        const evaluation = await GeminiService.evaluateBookWriting(
          session.activeTutorBookContent,
          session.activeTutorQuestion,
          text,
          session.activeTutorLevel,
          lang
        );
        if (this.getSession(telegramId) !== session) return;
        const evaluationText = this.formatWritingEvaluation(evaluation, session.activeTutorLevel || 'A1', lang);
        if (!evaluation.isCorrect) {
          const retryInstruction = lang === 'ru'
            ? 'Попробуйте ещё раз ответить на это задание арабским письмом:'
            : lang === 'en'
              ? 'Try this task again in Arabic script:'
              : 'Shu topshiriqqa yana bir marta arab yozuvida javob yozing:';
          await ctx.reply(
            `${evaluationText}\n\n${retryInstruction}`,
            {
              reply_markup: exitKb,
            }
          );
          return;
        }
        feedback = evaluationText;
        session.activeTutorAnswerAccepted = true;
        session.activeTutorFeedback = [
          evaluation.feedback,
          ...evaluation.errors.map((error) => `${error.original} → ${error.correction}: ${error.explanation}`),
        ].join('\n').slice(0, 1200);
      }

      if ((session.activeTutorQuestionCount || 1) >= 5) {
        session.activeTutorAnswerAccepted = false;
        this.clearSession(telegramId);
        await ctx.reply(
          `${feedback}\n\n${
            lang === 'ru'
              ? '🎉 Вы выполнили 5 письменных заданий на арабском. На сегодня занятие завершено — до следующего урока!'
              : lang === 'en'
                ? '🎉 You completed 5 Arabic writing tasks. That is all for today—goodbye until the next lesson!'
                : '🎉 5 ta arabcha yozma mashq yakunlandi. Bugungi mashg‘ulot tugadi — keyingi darsgacha xayr!'
          }`,
          { reply_markup: await BotKeyboards.getMainMenu(lang) }
        );
        return;
      }

      const nextQuestion = await GeminiService.generateBookWritingTask(
        session.activeTutorBookContent,
        lang,
        session.activeTutorLevel,
        (session.activeTutorQuestionCount || 1) + 1,
        session.activeTutorQuestion,
        await this.getRecentBookQuestions(telegramId, groupId),
        session.activeTutorFeedback
      );
      if (this.getSession(telegramId) !== session) return;
      session.activeTutorQuestion = nextQuestion;
      session.activeTutorQuestionCount = (session.activeTutorQuestionCount || 1) + 1;
      session.activeTutorAnswerAccepted = false;
      session.activeTutorFeedback = undefined;
      session.activeTutorQuestionDelivered = false;
      await this.saveTutorQuestion(telegramId, groupId, bookId, nextQuestion);
      await ctx.reply(
        `${feedback}\n\n${this.formatWritingTask(
          nextQuestion,
          session.activeTutorLevel || 'A1',
          session.activeTutorQuestionCount,
          lang,
          true
        )}`,
        {
          reply_markup: exitKb,
        }
      );
      session.activeTutorQuestionDelivered = true;
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[AI Tutor] Arabcha yozuvni tekshirish yoki mashq yaratish xatosi:', message);
      if (session.activeTutorAnswerAccepted) {
        await ctx.reply(
          lang === 'ru'
            ? 'Ответ принят, но следующий вопрос не удалось подготовить. Отправьте /resume, чтобы повторить.'
            : lang === 'en'
              ? 'Your answer was accepted, but the next question could not be prepared. Send /resume to retry.'
              : 'Javobingiz qabul qilindi, lekin keyingi savol tayyorlanmadi. Qayta urinish uchun /resume yuboring.',
          { reply_markup: exitKb }
        );
      } else {
        await ctx.reply(
          lang === 'ru'
            ? 'Не удалось проверить ответ по книге. Попробуйте ещё раз позже.'
            : lang === 'en'
              ? 'Could not check the answer against the book. Please try again later.'
              : 'Javobni kitob asosida tekshirib bo‘lmadi. Iltimos, keyinroq urinib ko‘ring.',
          { reply_markup: exitKb }
        );
      }
    } finally {
      session.isProcessingTutorAnswer = false;
    }
  }

}

export const botManager = BotManager.getInstance();
