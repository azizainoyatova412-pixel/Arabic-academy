"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.botManager = exports.BotManager = void 0;
const grammy_1 = require("grammy");
const index_js_1 = require("../db/index.js");
const config_js_1 = require("../config.js");
const i18n_js_1 = require("./i18n.js");
const keyboards_js_1 = require("./keyboards.js");
const gemini_js_1 = require("../services/gemini.js");
const academySync_js_1 = require("../services/academySync.js");
class BotManager {
    static instance;
    bot = null;
    isRunning = false;
    currentToken = '';
    sessions = new Map();
    constructor() { }
    static getInstance() {
        if (!BotManager.instance) {
            BotManager.instance = new BotManager();
        }
        return BotManager.instance;
    }
    getSession(telegramId) {
        if (!this.sessions.has(telegramId)) {
            this.sessions.set(telegramId, { state: 'idle' });
        }
        return this.sessions.get(telegramId);
    }
    clearSession(telegramId) {
        const s = this.getSession(telegramId);
        this.sessions.set(telegramId, { state: 'idle', isAdmin: s.isAdmin });
    }
    /**
     * Admin bilan to'g'ridan-to'g'ri Telegram shaxsiy chatiga o'tish havolasi
     * Faqat bitta ADMIN_ID ishlatiladi!
     */
    getAdminTelegramUrl(prefilledText) {
        const adminId = (config_js_1.config.adminTelegramContact || config_js_1.config.adminId || '8145529224').trim().replace(/^@/, '');
        if (/^https?:\/\//i.test(adminId))
            return adminId;
        // Agar raqam bo'lsa (masalan 8145529224) - Telegram chatini to'g'ridan-to'g'ri ochadi
        if (/^\d+$/.test(adminId)) {
            return `tg://user?id=${adminId}`;
        }
        if (prefilledText) {
            return `https://t.me/${adminId}?text=${encodeURIComponent(prefilledText)}`;
        }
        return `https://t.me/${adminId}`;
    }
    async getStatus() {
        const hasToken = Boolean(config_js_1.config.botToken && config_js_1.config.botToken.trim().length > 0);
        let botUsername;
        if (this.bot && this.isRunning) {
            try {
                const me = await this.bot.api.getMe();
                botUsername = me.username;
            }
            catch { }
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
    async start() {
        const activeToken = (config_js_1.config.botToken || '').trim();
        if (!activeToken) {
            console.error('❌ [Telegram Bot] Bot tokeni (.env dagi BOT_TOKEN) topilmadi.');
            this.isRunning = false;
            return;
        }
        if (!/^\d+$/.test(config_js_1.config.adminId)) {
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
            const testBot = new grammy_1.Bot(activeToken);
            const me = await testBot.api.getMe();
            console.log(`✅ [Telegram Bot] Bot yaroqli: @${me.username}`);
            this.currentToken = activeToken;
            this.bot = new grammy_1.Bot(activeToken);
            this.setupHandlers(this.bot);
            // Webhookni tozalash
            await this.bot.api.deleteWebhook({ drop_pending_updates: true }).catch((err) => {
                console.warn('⚠️ [Telegram Bot] Webhook tozalashda ogohlantirish:', err.message);
            });
            // Buyruqlarni o'rnatish: Faqat /start
            await this.bot.api.setMyCommands([
                { command: 'start', description: "Botni qayta ishga tushirish" },
                { command: 'review', description: "Kurs haqida sharh yuborish" },
            ]).catch(() => { });
            await this.bot.api.setChatMenuButton({
                menu_button: { type: 'default' },
            }).catch(() => { });
            this.bot
                .start({
                onStart: (info) => {
                    this.isRunning = true;
                    console.log(`🚀 [Telegram Bot] @${info.username} muvaffaqiyatli ishga tushdi!`);
                },
            })
                .catch((err) => {
                this.isRunning = false;
                const message = err?.message || String(err);
                if (/409|terminated by other getUpdates request|conflict/i.test(message)) {
                    console.error('❌ [Telegram Bot] Shu BOT_TOKEN bilan boshqa bot jarayoni ham ishlayapti. Sayt backend va bot service orasida bitta polling nusxasini qoldiring.');
                }
                console.warn('⚠️ [Telegram Bot] Polling xatosi:', message);
            });
        }
        catch (err) {
            this.isRunning = false;
            console.error('❌ [Telegram Bot] Botni ishga tushirishda xatolik:', err?.message || err);
        }
    }
    async restart() {
        console.log('🔄 [Telegram Bot] Bot qayta yuklanmoqda...');
        await this.stop();
        await this.start();
    }
    async stop() {
        if (this.bot && this.isRunning) {
            try {
                await this.bot.stop();
                console.log('🛑 [Telegram Bot] Bot to\'xtatildi.');
            }
            catch (err) {
                console.warn('⚠️ [Telegram Bot] To\'xtatishda xato:', err);
            }
            finally {
                this.isRunning = false;
                this.bot = null;
            }
        }
    }
    async sendToUser(telegramId, message) {
        if (!this.bot || !this.isRunning)
            return false;
        try {
            await this.bot.api.sendMessage(Number(telegramId), message, { parse_mode: 'HTML' });
            return true;
        }
        catch (err) {
            console.error(`[Telegram Bot] Send message to ${telegramId} failed:`, err);
            return false;
        }
    }
    isUserAdmin(telegramId, session) {
        if (session?.isAdmin)
            return true;
        const strId = String(telegramId);
        return strId === config_js_1.config.adminId;
    }
    setupHandlers(bot) {
        bot.catch(async (err) => {
            console.error('[Telegram Bot Error]:', err.error);
            const ctx = err.ctx;
            if (ctx && ctx.chat) {
                const telegramId = ctx.from?.id;
                const session = telegramId ? this.getSession(telegramId) : undefined;
                if (session && session.state === 'taking_test') {
                    try {
                        const lang = telegramId ? await i18n_js_1.I18nService.getUserLanguage(telegramId) : 'uz';
                        await this.finishQuiz(ctx, telegramId, session, lang);
                    }
                    catch (finishErr) {
                        console.error('Error in finishQuiz inside bot.catch:', finishErr);
                    }
                    return;
                }
                // Talab 1: "Kechirasiz, vaqtincha nosozlik yuz berdi..." umumiy xato xabari foydalanuvchiga chiqmasin
            }
        });
        // 1. /start buyrug'i
        bot.command('start', async (ctx) => {
            const telegramId = ctx.from?.id;
            if (!telegramId)
                return;
            const firstName = ctx.from?.first_name || '';
            const username = ctx.from?.username || '';
            const userRes = await index_js_1.db.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
            if (userRes.rows.length === 0) {
                await index_js_1.db.query(`INSERT INTO users (telegram_id, username, first_name, language_code, status, is_paid)
           VALUES ($1, $2, $3, 'uz', 'active', FALSE)`, [telegramId, username, firstName]);
            }
            else {
                await index_js_1.db.query(`UPDATE users SET last_active = CURRENT_TIMESTAMP, first_name = $1, username = $2 WHERE telegram_id = $3`, [firstName, username, telegramId]);
            }
            this.clearSession(telegramId);
            const langKeyboard = await keyboards_js_1.BotKeyboards.getLanguageKeyboard();
            await ctx.reply("Assalomu alaykum! Iltimos, tilni tanlang:\n\nПожалуйста, выберите язык:\n\nPlease choose your language:", { reply_markup: langKeyboard });
        });
        bot.command('review', async (ctx) => {
            const telegramId = ctx.from?.id;
            if (!telegramId)
                return;
            if (ctx.chat.type !== 'private') {
                await ctx.reply('Sharh yuborish uchun botga shaxsiy xabarda /review yuboring.');
                return;
            }
            const session = this.getSession(telegramId);
            session.state = 'waiting_review_text';
            const lang = await i18n_js_1.I18nService.getUserLanguage(telegramId);
            const prompts = {
                uz: '✍️ Kurs haqidagi fikringizni bitta xabar qilib yuboring. Admin tasdiqlagandan keyin saytda ko‘rinadi. Bekor qilish uchun /cancel yozing.',
                ru: '✍️ Отправьте одним сообщением отзыв о курсе. Он появится на сайте после одобрения администратора. Для отмены отправьте /cancel.',
                en: '✍️ Send your course review in one message. It will appear on the website after admin approval. Send /cancel to cancel.',
            };
            await ctx.reply(prompts[lang] || prompts.uz);
        });
        // 2. /admin buyrug'i (Parol so'raydi, so'ngra qulay boshqaruv panelini ochadi)
        bot.command('admin', async (ctx) => {
            const telegramId = ctx.from?.id;
            if (!telegramId)
                return;
            await this.handleAdminCommand(ctx, telegramId);
        });
        // 3. Til tanlash callback
        bot.callbackQuery(/^set_lang:(.+)$/, async (ctx) => {
            const telegramId = ctx.from.id;
            const langCode = ctx.match[1];
            await i18n_js_1.I18nService.setUserLanguage(telegramId, langCode);
            await ctx.answerCallbackQuery({ text: '✅ Saqlandi' }).catch(() => { });
            let welcomeText = '';
            if (langCode === 'ru') {
                welcomeText =
                    `🌟 <b>Ассаламу алейкум ва рахматуллахи ва баракатух!</b>\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `Добро пожаловать в официальный учебный бот Академии арабского языка <b>Aisha Uzbikiyya</b>.\n\n` +
                        `📖 В меню доступны ежедневные тесты, статистика и AI Учитель по загруженным книгам.\n\n` +
                        `<i>Выберите нужный раздел в меню ниже:</i>`;
            }
            else if (langCode === 'en') {
                welcomeText =
                    `🌟 <b>Assalamu alaykum wa rahmatullahi wa barakatuh!</b>\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `Welcome to the official learning bot of the <b>Aisha Uzbikiyya</b> Arabic Academy.\n\n` +
                        `📖 Use the menu below for daily quizzes, statistics, and an AI Tutor based on uploaded books.\n\n` +
                        `<i>Please select an option from the menu below:</i>`;
            }
            else {
                welcomeText =
                    `🌟 <b>Assalomu alaykum va rahmatullohi va barakatuh!</b>\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `<b>Aisha Uzbikiyya</b> arab tili akademiyasining rasmiy o'quv botiga xush kelibsiz.\n\n` +
                        `📖 Menyuda kunlik testlar, statistika va yuklangan kitoblar asosida ishlaydigan AI Ustoz mavjud.\n\n` +
                        `<i>Kerakli bo'limni quyidagi menyudan tanlang:</i>`;
            }
            const mainKb = await keyboards_js_1.BotKeyboards.getMainMenu(langCode);
            await ctx.reply(welcomeText, { parse_mode: 'HTML', reply_markup: mainKb });
        });
        // 4. "Kursga yozilish" callback (eski tugmalar bosilganda)
        bot.callbackQuery('action_enroll', async (ctx) => {
            await ctx.answerCallbackQuery().catch(() => { });
            const telegramId = ctx.from.id;
            const lang = await i18n_js_1.I18nService.getUserLanguage(telegramId);
            const mainKb = await keyboards_js_1.BotKeyboards.getMainMenu(lang);
            await ctx.reply(lang === 'ru'
                ? "Вы уже являетесь учеником академии. Используйте главное меню:"
                : lang === 'en'
                    ? "You are already enrolled. Please use the main menu:"
                    : "Siz allaqachon akademiya o'quvchisiz. Asosiy menyudan foydalaning:", { reply_markup: mainKb });
        });
        // 5. Guruh tanlash callback (Kirish kodi so'rash)
        bot.callbackQuery(/^join_group:(\d+)$/, async (ctx) => {
            const telegramId = ctx.from.id;
            const groupId = parseInt(ctx.match[1], 10);
            const lang = await i18n_js_1.I18nService.getUserLanguage(telegramId);
            await ctx.answerCallbackQuery().catch(() => { });
            const groupRes = await index_js_1.db.query('SELECT * FROM groups WHERE id = $1', [groupId]);
            if (groupRes.rows.length === 0) {
                await ctx.reply(lang === 'ru' ? "Группа не найдена." : "Guruh topilmadi.");
                return;
            }
            const session = this.getSession(telegramId);
            session.state = 'waiting_group_code';
            session.selectedGroupId = groupId;
            const askCodeText = lang === 'ru'
                ? "Пожалуйста, введите код доступа к группе:"
                : "Iltimos, guruhga kirish maxsus kodini kiriting:";
            await ctx.reply(`🔒 <b>${groupRes.rows[0].name}</b>\n━━━━━━━━━━━━━━━━━━━━\n${askCodeText}`, { parse_mode: 'HTML' });
        });
        // 6. Statistika: Bitta tugma bilan ochib-yopish callback (⬇️ / ⬆️)
        bot.callbackQuery(/^toggle_stats:(open|close)$/, async (ctx) => {
            const telegramId = ctx.from.id;
            const action = ctx.match[1]; // 'open' or 'close'
            const lang = await i18n_js_1.I18nService.getUserLanguage(telegramId);
            await ctx.answerCallbackQuery().catch(() => { });
            await this.renderAllGroupsStatsCard(ctx, telegramId, lang, action === 'open', true);
        });
        bot.callbackQuery(/^tutor_book:(\d+)$/, async (ctx) => {
            const telegramId = ctx.from.id;
            const lang = await i18n_js_1.I18nService.getUserLanguage(telegramId);
            await ctx.answerCallbackQuery().catch(() => { });
            await ctx.replyWithChatAction('typing').catch(() => { });
            try {
                const book = await (0, academySync_js_1.getAcademyBookText)(Number(ctx.match[1]));
                const session = this.getSession(telegramId);
                session.state = 'chatting_with_ai_tutor';
                session.activeTutorBookId = Number(ctx.match[1]);
                session.activeTutorBookTitle = book.title;
                const bookContent = book.text.slice(0, 16000);
                session.activeTutorBookContent = bookContent;
                const question = await gemini_js_1.GeminiService.generateBookQuestion(bookContent, lang);
                session.activeTutorQuestion = question;
                await ctx.reply(`📖 Kitob asosidagi savol:\n\n${question}\n\nJavobingizni yozing.`, {
                    reply_markup: keyboards_js_1.BotKeyboards.getAITutorExitKeyboard(lang),
                });
            }
            catch (error) {
                this.clearSession(telegramId);
                console.error('[AI Tutor] Sayt kitobidan savol yaratib bo‘lmadi:', error.message);
                await ctx.reply(lang === 'ru'
                    ? 'Не удалось подготовить вопрос по книге. Попробуйте позже.'
                    : lang === 'en'
                        ? 'Could not prepare a question from the book. Please try again later.'
                        : 'Kitobdan savol tayyorlab bo‘lmadi. Iltimos, keyinroq qayta urinib ko‘ring.');
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
            const lang = await i18n_js_1.I18nService.getUserLanguage(telegramId);
            await ctx.reply("Asosiy menyuga qaytdingiz:", { reply_markup: await keyboards_js_1.BotKeyboards.getMainMenu(lang) });
        });
        // 9. Test javoblari callback
        bot.callbackQuery(/^quiz_answer:(\d+)$/, async (ctx) => {
            const telegramId = ctx.from.id;
            const selectedIndex = parseInt(ctx.match[1], 10);
            const session = this.getSession(telegramId);
            const lang = await i18n_js_1.I18nService.getUserLanguage(telegramId);
            if (session.state !== 'taking_test' || !session.testQuestions) {
                await ctx.answerCallbackQuery().catch(() => { });
                return;
            }
            const currentIdx = session.testCurrentIndex || 0;
            const question = session.testQuestions[currentIdx];
            const isCorrect = selectedIndex === question.correctIndex;
            if (isCorrect) {
                session.testScore = (session.testScore || 0) + 1;
                await ctx.answerCallbackQuery({ text: '✅ To\'g\'ri!' }).catch(() => { });
            }
            else {
                await ctx.answerCallbackQuery({ text: '❌ Noto\'g\'ri' }).catch(() => { });
            }
            const topicName = question.topic || 'Arab tili';
            const userAnswerText = question.options[selectedIndex] || '';
            const correctAnswerText = question.options[question.correctIndex] || '';
            // Sessiyadagi joriy test javoblari ro'yxatiga qo'shish
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
            // user_quiz_history jadvaliga saqlash (takrorlanmaslik va mustahkamlash uchun)
            try {
                await index_js_1.db.query(`INSERT INTO user_quiz_history 
           (telegram_id, question, topic, is_correct, user_answer, correct_answer, explanation)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                    telegramId,
                    question.question,
                    topicName,
                    isCorrect,
                    userAnswerText,
                    correctAnswerText,
                    question.explanation || '',
                ]);
            }
            catch (dbErr) {
                console.warn('user_quiz_history insert error:', dbErr);
            }
            // Zaif mavzular statistikasi
            try {
                const topicCheck = await index_js_1.db.query('SELECT id, correct_count, wrong_count FROM user_topic_stats WHERE telegram_id = $1 AND topic = $2', [telegramId, topicName]);
                if (topicCheck.rows.length > 0) {
                    if (isCorrect) {
                        await index_js_1.db.query('UPDATE user_topic_stats SET correct_count = correct_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [topicCheck.rows[0].id]);
                    }
                    else {
                        await index_js_1.db.query('UPDATE user_topic_stats SET wrong_count = wrong_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [topicCheck.rows[0].id]);
                    }
                }
                else {
                    await index_js_1.db.query('INSERT INTO user_topic_stats (telegram_id, topic, correct_count, wrong_count) VALUES ($1, $2, $3, $4)', [telegramId, topicName, isCorrect ? 1 : 0, isCorrect ? 0 : 1]);
                }
            }
            catch (e) {
                console.warn('user_topic_stats error:', e);
            }
            session.testCurrentIndex = currentIdx + 1;
            if (session.testCurrentIndex < session.testQuestions.length) {
                await this.sendNextQuizQuestion(ctx, telegramId, session, lang);
            }
            else {
                await this.finishQuiz(ctx, telegramId, session, lang);
            }
        });
        // 9.1. Test xatolarini bitta tugma bilan ochish / yopish callback (editMessageText orqali)
        bot.callbackQuery(/^toggle_quiz_review:(open|close)$/, async (ctx) => {
            const telegramId = ctx.from.id;
            const action = ctx.match[1];
            const session = this.getSession(telegramId);
            const lang = await i18n_js_1.I18nService.getUserLanguage(telegramId);
            await ctx.answerCallbackQuery().catch(() => { });
            const isOpen = action === 'open';
            const text = this.renderQuizSummaryText(session, isOpen, lang);
            const kb = keyboards_js_1.BotKeyboards.getQuizReviewKeyboard(isOpen, lang);
            try {
                await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
            }
            catch (err) {
                console.warn('Quiz review toggle error:', err);
            }
        });
        // 10. Barcha matnli xabarlar
        bot.on('message:text', async (ctx) => {
            const telegramId = ctx.from.id;
            const text = ctx.message.text.trim();
            const session = this.getSession(telegramId);
            const lang = await i18n_js_1.I18nService.getUserLanguage(telegramId);
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
                    await (0, academySync_js_1.submitAcademyReview)(telegramId, name, text);
                    session.state = 'idle';
                    await ctx.reply(lang === 'ru'
                        ? '✅ Спасибо! Отзыв отправлен администратору на проверку.'
                        : lang === 'en'
                            ? '✅ Thank you! Your review has been sent to the admin for approval.'
                            : '✅ Rahmat! Sharhingiz admin tasdig‘iga yuborildi.');
                }
                catch (error) {
                    console.error('[Academy Sync] Sharhni saytga yuborib bo‘lmadi:', error.message);
                    session.state = 'idle';
                    await ctx.reply(lang === 'ru'
                        ? '❌ Не удалось отправить отзыв. Попробуйте позже.'
                        : lang === 'en'
                            ? '❌ Could not send the review. Please try again later.'
                            : '❌ Sharh yuborilmadi. Keyinroq qayta urinib ko‘ring.');
                }
                return;
            }
            // Agar guruh kodini kutayotgan bo'lsa
            if (session.state === 'waiting_group_code' && session.selectedGroupId) {
                await this.handleGroupCodeVerification(ctx, telegramId, text, session.selectedGroupId, lang);
                return;
            }
            // Agar admin parolini kutayotgan bo'lsa
            if (session.state === 'waiting_admin_password') {
                const enteredPass = text.trim();
                const validPasswords = ['makkahh', config_js_1.config.adminPassword, '123'].filter(Boolean);
                if (validPasswords.includes(enteredPass)) {
                    session.isAdmin = true;
                    session.state = 'idle';
                    const adminUrl = this.getAcademyAdminUrl();
                    await ctx.reply(`✅ <b>Muvaffaqiyatli tasdiqlandingiz!</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
                        `👑 Sizga administrator huquqi berildi.\n\n` +
                        `🌐 Sayt admin paneli havolasi:\n👉 <b>${adminUrl}</b>\n\n` +
                        `Parol: <code>${enteredPass}</code>`, { parse_mode: 'HTML' });
                }
                else {
                    await ctx.reply("❌ Noto'g'ri parol. Qaytadan urinib ko'ring yoki /cancel deb yozing.");
                }
                return;
            }
            const lower = text.toLowerCase();
            // 0. Admin panel menyu tugmasi yoki /admin
            if (text.includes('Admin Panel') || text.includes('Админ Панель') || lower === '/admin') {
                await this.handleAdminCommand(ctx, telegramId);
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
                    const testSettingsRes = await index_js_1.db.query('SELECT * FROM test_settings LIMIT 1');
                    const settings = testSettingsRes.rows[0];
                    const dailyLimit = settings && settings.test_daily_limit !== null ? Number(settings.test_daily_limit) : 1;
                    if (dailyLimit > 0) {
                        const today = (0, index_js_1.getTashkentDate)();
                        const checkAttempt = await index_js_1.db.query('SELECT COUNT(*) as count FROM daily_test_attempts WHERE telegram_id = $1 AND test_date = $2', [telegramId, today]);
                        const attemptCount = Number(checkAttempt.rows[0]?.count || 0);
                        if (attemptCount >= dailyLimit) {
                            await ctx.reply(`Siz bugungi test limitingizdan to'liq foydalandingiz.\n\n⏳ Sizning limitingiz 00:00 da ochiladi.`);
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
            await ctx.reply("Iltimos, quyidagi asosiy menyu tugmalaridan foydalaning:", { reply_markup: await keyboards_js_1.BotKeyboards.getMainMenu(lang) });
        });
    }
    /**
     * Admin panel ochish (/admin buyrug'i va menyu tugmasi uchun)
     */
    async handleAdminCommand(ctx, telegramId) {
        const session = this.getSession(telegramId);
        if (!this.isUserAdmin(telegramId, session)) {
            session.state = 'waiting_admin_password';
            await ctx.reply("🔐 <b>Administrator Paneli</b>\n━━━━━━━━━━━━━━━━━━━━\n" +
                "Iltimos, administrator parolini kiriting:\n\n" +
                "<i>(Bekor qilish uchun /cancel deb yozing)</i>", { parse_mode: 'HTML' });
            return;
        }
        const adminUrl = this.getAcademyAdminUrl();
        await ctx.reply(`👑 <b>Administrator Paneli</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
            `🌐 Sayt admin paneli havolasi:\n👉 <b>${adminUrl}</b>\n\n` +
            `💡 Bu yerda siz barcha guruhlar, o'quvchilar, baholar, sharhlar va statistikalarni to'liq boshqara olasiz.`, { parse_mode: 'HTML' });
    }
    getAcademyAdminUrl() {
        return config_js_1.config.academyAdminUrl || (config_js_1.config.academyApiUrl ? `${config_js_1.config.academyApiUrl}/admin` : '');
    }
    /**
     * Guruh kodini tekshirish
     */
    async handleGroupCodeVerification(ctx, telegramId, enteredCode, groupId, lang) {
        const groupRes = await index_js_1.db.query('SELECT * FROM groups WHERE id = $1', [groupId]);
        if (groupRes.rows.length === 0) {
            await ctx.reply("Guruh topilmadi.");
            this.clearSession(telegramId);
            return;
        }
        const group = groupRes.rows[0];
        const isCodeValid = group.access_code.trim().toUpperCase() === enteredCode.trim().toUpperCase();
        if (isCodeValid) {
            await index_js_1.db.query('UPDATE users SET joined_group_id = $1 WHERE telegram_id = $2', [groupId, telegramId]);
            this.clearSession(telegramId);
            let msg = `✅ <b>Tabriklaymiz!</b> Siz muvaffaqiyatli <b>${group.name}</b> guruhiga qabul qilindingiz!`;
            if (group.telegram_invite_link) {
                msg += `\n\n👉 <a href="${group.telegram_invite_link}">Guruh havolasiga o'tish</a>`;
            }
            await ctx.reply(msg, {
                parse_mode: 'HTML',
                reply_markup: await keyboards_js_1.BotKeyboards.getMainMenu(lang),
            });
            if (group.telegram_chat_id && this.bot) {
                try {
                    await this.bot.api.approveChatJoinRequest(group.telegram_chat_id, telegramId);
                }
                catch { }
            }
        }
        else {
            await ctx.reply("❌ Kod noto'g'ri kiritildi. Iltimos, qaytadan urinib ko'ring:");
        }
    }
    /**
     * Guruhlar ro'yxati
     */
    async handleGroupsList(ctx, telegramId, lang) {
        const groupsRes = await index_js_1.db.query('SELECT id, name, description FROM groups WHERE is_active = TRUE ORDER BY id ASC');
        if (groupsRes.rows.length === 0) {
            await ctx.reply("Hozirda faol guruhlar mavjud emas.");
            return;
        }
        const titleMsg = "👥 <b>Mavjud o'quv guruhlari:</b>\nKirish kodini kiritish uchun kerakli guruhni tanlang:";
        const keyboard = keyboards_js_1.BotKeyboards.createGroupsKeyboard(groupsRes.rows);
        await ctx.reply(titleMsg, { parse_mode: 'HTML', reply_markup: keyboard });
    }
    /**
     * BARCHA GURUHLAR STATISTIKASI VA REYTINGI
     * Guruh tanlash olib tashlangan — butun maktab bitta reytingda ko'rsatiladi.
     * Bitta ⬇️ / ⬆️ tugmasi bilan ochilib-yopiladi, bot chati to'lib ketmaydi!
     */
    async renderAllGroupsStatsCard(ctx, telegramId, lang, isExpanded = false, isEdit = false) {
        let academyStats;
        let academyStatsError = false;
        if (config_js_1.config.academyApiUrl && config_js_1.config.academySyncSecret) {
            try {
                academyStats = await (0, academySync_js_1.getAcademyStudentStats)(telegramId);
            }
            catch (error) {
                academyStatsError = true;
                console.warn('[Academy Sync] Sayt o‘quvchi statistikasini olib bo‘lmadi:', error.message);
            }
        }
        let report = `📊 <b>SAYTDAGI O'QUV STATISTIKASI</b>\n`;
        report += `━━━━━━━━━━━━━━━━━━━━\n`;
        if (academyStatsError) {
            report += `⚠️ <i>Sayt statistikasi hozircha yuklanmadi. Keyinroq qayta urinib ko‘ring.</i>\n`;
        }
        else if (!config_js_1.config.academyApiUrl || !config_js_1.config.academySyncSecret) {
            report += `⚠️ <i>Sayt bilan sinxronlash sozlanmagan.</i>\n`;
        }
        else if (!academyStats?.groups.length) {
            report += `ℹ️ <i>Saytda sizning Telegram ID'ingiz bilan bog‘langan faol guruh va baholar topilmadi.</i>\n`;
        }
        else {
            for (const group of academyStats.groups) {
                const progressLabel = group.progressStatus === 'improved'
                    ? `📈 +${group.progressDifference}`
                    : group.progressStatus === 'declined'
                        ? `📉 ${group.progressDifference}`
                        : group.progressStatus === 'unchanged'
                            ? '➡️ O‘zgarish yo‘q'
                            : '⏳ Hali yetarli baho yo‘q';
                report += `🏫 <b>${group.groupName}</b>\n`;
                report += `🏆 O‘rningiz: <b>${group.rank}/${group.groupSize}</b>\n`;
                report += `⭐ Joriy oy ballari: <b>${group.monthPoints}</b> · jami ball: <b>${group.totalPoints}</b>\n`;
                report += `📝 Baholangan darslar: <b>${group.gradedLessons}</b> · o‘rtacha: <b>${group.averageGrade ?? '—'}</b>\n`;
                report += `${progressLabel}\n`;
            }
        }
        if (isExpanded) {
            for (const group of academyStats?.groups || []) {
                report += `\n🏅 <b>${group.groupName} reytingi</b>\n`;
                if (!group.leaderboard.length) {
                    report += `<i>Saytda reyting ma'lumoti yo'q.</i>\n`;
                    continue;
                }
                group.leaderboard.forEach((student) => {
                    const medal = student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : student.rank === 3 ? '🥉' : `<b>#${student.rank}</b>`;
                    const name = student.fullName || 'O‘quvchi';
                    const isMe = Number(student.telegramId) === Number(telegramId);
                    report += `${medal} <b>${name}</b> — ⭐️ <b>${student.monthPoints} ball</b>${isMe ? ' 👈 (Siz)' : ''}\n`;
                });
            }
        }
        else {
            report += `\n💡 <i>Sayt guruhlaridagi reytingni ko'rish uchun pastdagi tugmani bosing:</i>`;
        }
        const kb = keyboards_js_1.BotKeyboards.getStatsToggleKeyboard(isExpanded, lang);
        if (isEdit && ctx.chat) {
            try {
                await ctx.editMessageText(report, { parse_mode: 'HTML', reply_markup: kb });
                return;
            }
            catch (e) { }
        }
        await ctx.reply(report, { parse_mode: 'HTML', reply_markup: kb });
    }
    /**
     * Aloqa / Yordam bo'limi (Admin Telegram shaxsiy chatiga to'g'ridan-to'g'ri o'tish)
     */
    async handleSupportInfo(ctx, lang) {
        const adminUrl = this.getAdminTelegramUrl("Assalomu alaykum, arab tili kurslari bo'yicha savolim bor edi");
        const kb = keyboards_js_1.BotKeyboards.getContactAdminKeyboard(adminUrl, lang, '💬 Admin Shaxsiy Chatiga Yozish');
        const msg = `💬 <b>Admin bilan Bog'lanish Markazi</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `Arab tili kurslari va darslar bo'yicha savollaringiz uchun administratorga yozishingiz mumkin.\n\n` +
            `👇 Administrator bilan shaxsiy chatda bog'lanish uchun pastdagi tugmani bosing:`;
        await ctx.reply(msg, {
            parse_mode: 'HTML',
            reply_markup: kb,
        });
    }
    /** Course enrollment questions are handled by the administrator. */
    async handleEnrollmentInfo(ctx, lang) {
        const adminUrl = this.getAdminTelegramUrl("Assalomu alaykum, arab tili kursiga yozilmoqchiman");
        const kb = keyboards_js_1.BotKeyboards.getContactAdminKeyboard(adminUrl, lang, '💬 Kurs haqida bog‘lanish');
        const msg = `📚 <b>Kursga yozilish</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `Kursga yozilish va darslar haqida ma'lumot olish uchun administrator bilan bog'laning.\n\n` +
            `👇 Administratorning Telegram sahifasi:`;
        await ctx.reply(msg, {
            parse_mode: 'HTML',
            reply_markup: kb,
        });
    }
    /**
     * Test boshlash (Band 1 & 5: Kitob va mavzular asosida qattiq test, umumiy xato xabarisiz)
     */
    async startQuiz(ctx, telegramId, lang, isDaily = true) {
        const waitMsg = await ctx.reply("⏳ <i>Arab tili test savollari tayyorlanmoqda...</i>", { parse_mode: 'HTML' });
        try {
            // 1. Foydalanuvchi ilgari to'g'ri yechgan savollar ro'yxatini olamiz (qayta takrorlanmasligi uchun)
            const prevCorrectRes = await index_js_1.db.query(`SELECT DISTINCT question FROM user_quiz_history 
         WHERE telegram_id = $1 AND is_correct = TRUE 
         ORDER BY question ASC LIMIT 50`, [telegramId]);
            const excludedQuestions = prevCorrectRes.rows.map((r) => r.question);
            // 2. Admin panelda sozlangan test parametrlarini yuklaymiz
            const tSettingsRes = await index_js_1.db.query('SELECT * FROM test_settings LIMIT 1');
            const tSettings = tSettingsRes.rows[0];
            const bookText = tSettings?.book_text || undefined;
            const topicsRange = tSettings?.selected_topics || 'all';
            let questionTypes = undefined;
            try {
                if (tSettings?.question_types) {
                    questionTypes = typeof tSettings.question_types === 'string'
                        ? JSON.parse(tSettings.question_types)
                        : tSettings.question_types;
                }
            }
            catch { }
            const qCount = tSettings?.question_count ? Number(tSettings.question_count) : 5;
            let questions = [];
            try {
                questions = await gemini_js_1.GeminiService.generateHardTestQuestions({
                    bookText,
                    topicsRange,
                    questionTypes,
                    count: qCount,
                    excludedQuestions,
                    lang,
                });
            }
            catch (genErr) {
                console.warn('generateHardTestQuestions error, fallback questions ishlatiladi:', genErr);
                questions = gemini_js_1.GeminiService.getFilteredFallbackQuestions(lang, excludedQuestions).slice(0, qCount);
            }
            if (!questions || questions.length === 0) {
                questions = gemini_js_1.GeminiService.getFilteredFallbackQuestions(lang).slice(0, qCount);
            }
            const session = this.getSession(telegramId);
            session.state = 'taking_test';
            session.testQuestions = questions;
            session.testAttempts = [];
            session.testCurrentIndex = 0;
            session.testScore = 0;
            session.isDailyTest = isDaily;
            await this.sendNextQuizQuestion(ctx, telegramId, session, lang, waitMsg.message_id);
        }
        catch (err) {
            console.error('startQuiz xatoligi (Band 1 bo\'yicha zaxira):', err);
            // Agar qandaydir kutilmagan xato bo'lsa ham umumiy xato xabari chiqmasin, zaxira savollari bilan test boshlanadi
            const fallbackQuestions = gemini_js_1.GeminiService.getFilteredFallbackQuestions(lang).slice(0, 5);
            const session = this.getSession(telegramId);
            session.state = 'taking_test';
            session.testQuestions = fallbackQuestions;
            session.testAttempts = [];
            session.testCurrentIndex = 0;
            session.testScore = 0;
            session.isDailyTest = isDaily;
            await this.sendNextQuizQuestion(ctx, telegramId, session, lang, waitMsg.message_id);
        }
    }
    async sendNextQuizQuestion(ctx, telegramId, session, lang, editMessageId) {
        if (!session.testQuestions)
            return;
        const idx = session.testCurrentIndex || 0;
        const total = session.testQuestions.length;
        const q = session.testQuestions[idx];
        const topicText = q.topic ? ` (Mavzu: <i>${q.topic}</i>)` : '';
        const title = `📝 <b>${idx + 1}-savol (jami ${total} ta):</b>${topicText}\n━━━━━━━━━━━━━━━━━━━━\n\n${q.question}`;
        const keyboard = keyboards_js_1.BotKeyboards.createQuizKeyboard(q.options);
        if (editMessageId && ctx.chat) {
            try {
                await ctx.api.editMessageText(ctx.chat.id, editMessageId, title, {
                    parse_mode: 'HTML',
                    reply_markup: keyboard,
                });
                return;
            }
            catch (err) { }
        }
        await ctx.reply(title, { parse_mode: 'HTML', reply_markup: keyboard });
    }
    /**
     * Test xulosasi matnini shakllantirish (xatolar ochilgan yoki yopilgan holatda)
     */
    renderQuizSummaryText(session, isOpen, lang) {
        const score = session.lastQuizScore || 0;
        const total = session.lastQuizTotal || 5;
        const wrong = total - score;
        const percentage = session.lastQuizPercentage || 0;
        const levelTitle = session.lastQuizLevelTitle || "A1 Boshlang'ich Daraja";
        const comment = session.lastQuizComment || "";
        let text = `🎉 <b>Test Yakunlandi!</b>\n` +
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
            return text;
        }
        if (isOpen) {
            text += `\n🔍 <b>Xato qilingan savollar va to'g'ri javoblari:</b>\n\n`;
            const wrongList = (session.lastQuizAttempts || []).filter((a) => !a.isCorrect);
            wrongList.forEach((att, idx) => {
                text += `<b>${idx + 1}-savol:</b> ${att.question}\n`;
                text += `   ❌ <b>Sizning javobingiz:</b> <s>${att.userAnswerText}</s>\n`;
                text += `   ✅ <b>To'g'ri javob:</b> <b>${att.correctAnswerText}</b>\n`;
                if (att.explanation) {
                    text += `   💡 <i>Izoh:</i> ${att.explanation}\n`;
                }
                text += `\n`;
            });
            text += `━━━━━━━━━━━━━━━━━━━━`;
        }
        else {
            text += `\n💡 <i>Xato qilingan savollar va to'g'ri javoblarini ko'rish uchun pastdagi tugmani bosing:</i>`;
        }
        return text;
    }
    async finishQuiz(ctx, telegramId, session, lang) {
        const score = session.testScore || 0;
        const total = session.testQuestions?.length || 5;
        const wrong = total - score;
        const percentage = Math.round((score / total) * 100);
        let level = 'A1';
        let levelTitle = "A1 Boshlang'ich Daraja";
        let comment = "Arab tili harflari, tovushlar va asosiy so'z boyligini mustahkamlash tavsiya etiladi.";
        if (percentage >= 80) {
            level = 'B2';
            levelTitle = "B2 Yuqori Daraja";
            comment = "Ajoyib natija! Murakkab nahv, sarf va erkin suhbat darajasi.";
        }
        else if (percentage >= 60) {
            level = 'B1';
            levelTitle = "B1 O'rta-Yuqori Daraja";
            comment = "Yaxshi natija! Sarf va jumlalar tahliliga ko'proq e'tibor qarating.";
        }
        else if (percentage >= 40) {
            level = 'A2';
            levelTitle = "A2 O'rta Daraja";
            comment = "Qoniqarli! Grammatika va lug'at ustida ishlashni davom ettiring.";
        }
        // Natijani bazaga yozish (Band 1: Test xatosi bo'lsa ham hech qachon yiqilmasdan yakunlansin)
        try {
            const userRes = await index_js_1.db.query('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);
            const userId = userRes.rows[0]?.id;
            if (userId) {
                await index_js_1.db.query(`INSERT INTO user_tests (user_id, telegram_id, score, total_questions, percentage, level, recommended_course)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`, [userId, telegramId, score, total, percentage, level, levelTitle]);
            }
            if (session.isDailyTest) {
                const today = (0, index_js_1.getTashkentDate)();
                await index_js_1.db.query(`INSERT INTO daily_test_attempts (telegram_id, test_date, score, total)
           VALUES ($1, $2, $3, $4)`, [telegramId, today, score, total]);
            }
        }
        catch (dbErr) {
            console.warn('⚠️ [finishQuiz db save error]:', dbErr);
        }
        // Natijalarni sessiyada saqlash (bitta tugma orqali ochib-yopish uchun)
        session.lastQuizAttempts = session.testAttempts ? [...session.testAttempts] : [];
        session.lastQuizScore = score;
        session.lastQuizTotal = total;
        session.lastQuizPercentage = percentage;
        session.lastQuizLevelTitle = levelTitle;
        session.lastQuizComment = comment;
        session.state = 'idle';
        session.testQuestions = undefined;
        session.testAttempts = undefined;
        session.testCurrentIndex = 0;
        session.testScore = 0;
        const summaryText = this.renderQuizSummaryText(session, false, lang);
        const kb = wrong > 0 ? keyboards_js_1.BotKeyboards.getQuizReviewKeyboard(false, lang) : undefined;
        await ctx.reply(summaryText, {
            parse_mode: 'HTML',
            reply_markup: kb,
        });
    }
    /** AI Ustoz uchun saytga yuklangan kitobni tanlash */
    async handleAITutorStart(ctx, telegramId, lang) {
        const session = this.getSession(telegramId);
        let books;
        try {
            books = await (0, academySync_js_1.getAcademyBooks)();
        }
        catch (error) {
            this.clearSession(telegramId);
            console.error('[AI Tutor] Saytdagi kitoblar ro‘yxatini olib bo‘lmadi:', error.message);
            await ctx.reply(lang === 'ru'
                ? 'Не удалось получить список книг с сайта. Попробуйте позже.'
                : lang === 'en'
                    ? 'Could not load the books from the website. Please try again later.'
                    : 'Saytdagi kitoblar ro‘yxatini olib bo‘lmadi. Keyinroq qayta urinib ko‘ring.');
            return;
        }
        books = books.filter((book) => Number.isSafeInteger(book.id) && book.title?.trim() && book.pdfPath?.trim());
        if (books.length === 0) {
            this.clearSession(telegramId);
            await ctx.reply(lang === 'ru'
                ? 'Пока нет загруженных книг с распознанным текстом. Попросите администратора загрузить книгу.'
                : lang === 'en'
                    ? 'There are no uploaded books with readable text yet. Ask the administrator to upload a book.'
                    : 'Hozircha matni o‘qiladigan yuklangan kitob yo‘q. Admindan kitob yuklashni so‘rang.');
            return;
        }
        session.state = 'selecting_ai_tutor_book';
        session.activeTutorBookId = undefined;
        session.activeTutorBookTitle = undefined;
        session.activeTutorBookContent = undefined;
        session.activeTutorQuestion = undefined;
        const prompt = lang === 'ru' ? 'Для начала выберите книгу:' :
            lang === 'en' ? 'Choose a book to begin:' :
                'Boshlash uchun kitobni tanlang:';
        await ctx.reply(prompt, {
            reply_markup: keyboards_js_1.BotKeyboards.getTutorBooksKeyboard(books.map((book) => ({ id: book.id, title: book.title })), lang),
        });
    }
    /**
     * AI Ustoz — O'quvchi javobini tekshirish va oldingi mavzulardan nazorat qilish
     */
    async handleAITutorUserMessage(ctx, telegramId, text, lang) {
        const session = this.getSession(telegramId);
        const exitKb = keyboards_js_1.BotKeyboards.getAITutorExitKeyboard(lang);
        if (!session.activeTutorBookContent || !session.activeTutorQuestion) {
            this.clearSession(telegramId);
            await ctx.reply(lang === 'ru'
                ? 'Сначала выберите книгу в разделе «ИИ Учитель».'
                : lang === 'en'
                    ? 'Please choose a book from AI Tutor first.'
                    : 'Avval AI Ustoz bo‘limidan kitob tanlang.');
            return;
        }
        await ctx.replyWithChatAction('typing').catch(() => { });
        try {
            const evaluation = await gemini_js_1.GeminiService.evaluateBookAnswer(session.activeTutorBookContent, session.activeTutorQuestion, text, lang);
            if (!evaluation.isCorrect) {
                await ctx.reply(`${evaluation.feedback}\n\nJavobingizni yana bir bor o‘ylab yozing:`, {
                    reply_markup: exitKb,
                });
                return;
            }
            const nextQuestion = await gemini_js_1.GeminiService.generateBookQuestion(session.activeTutorBookContent, lang, session.activeTutorQuestion);
            session.activeTutorQuestion = nextQuestion;
            await ctx.reply(`${evaluation.feedback}\n\n📖 Keyingi savol:\n\n${nextQuestion}`, {
                reply_markup: exitKb,
            });
        }
        catch (error) {
            console.error('[AI Tutor] Kitob asosidagi javobni tekshirib bo‘lmadi:', error.message);
            await ctx.reply(lang === 'ru'
                ? 'Не удалось проверить ответ по книге. Попробуйте ещё раз позже.'
                : lang === 'en'
                    ? 'Could not check the answer against the book. Please try again later.'
                    : 'Javobni kitob asosida tekshirib bo‘lmadi. Iltimos, keyinroq urinib ko‘ring.', { reply_markup: exitKb });
        }
    }
}
exports.BotManager = BotManager;
exports.botManager = BotManager.getInstance();
