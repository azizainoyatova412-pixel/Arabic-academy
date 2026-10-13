const { Bot } = require('grammy');
const db = require('../db/index');
const startCommand = require('./commands/start');
const reviewCommand = require('./commands/review');
const locales = require('./menus/locales');
require('dotenv').config();

const token = (process.env.BOT_TOKEN || '').trim();
let bot = null;

if (token && token.includes(':')) {
  try {
    bot = new Bot(token);

    // Komandalarni ulash
    bot.command('start', startCommand);
    bot.command('review', reviewCommand);
  } catch (err) {
    console.error('❌ Bot initsializatsiya qilishda xato:', err.message);
    bot = null;
  }
} else {
  console.warn('⚠️ BOT_TOKEN topilmadi yoki yaroqsiz formatda. Bot o\'chirilgan holda ishlaydi.');
}

if (bot) {
  // Til tanlash callback handling
  bot.callbackQuery(/^lang_(uz|ru|en)$/, async (ctx) => {
    const lang = ctx.match[1];
    const telegramId = ctx.from.id;
    const fullName = ctx.from.first_name + (ctx.from.last_name ? " " + ctx.from.last_name : "");

    await db.query(
      "INSERT INTO users (telegram_id, full_name, lang) VALUES ($1, $2, $3) ON CONFLICT (telegram_id) DO UPDATE SET lang = $3",
      [telegramId, fullName, lang]
    );

    const text = locales[lang];
    await ctx.reply(`${text.welcome}\n\n${text.levels}`, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [ 
          [{ text: `🟢 A1 - ${text.select_btn}`, callback_data: "choose_group_1" }],
          [{ text: `🔵 B1 - ${text.select_btn}`, callback_data: "choose_group_2" }],
          [{ text: `🔴 C2 - ${text.select_btn}`, callback_data: "choose_group_3" }]
        ]
      }
    });
    await ctx.answerCallbackQuery();
  });

  // Kurs darajasini tanlash; ro'yxatdan o'tish va to'lovlar sayt orqali boshqariladi.
  bot.callbackQuery(/^choose_group_(\d+)$/, async (ctx) => {
    const levels = { 1: 'A1', 2: 'B1', 3: 'C2' };
    const level = levels[ctx.match[1]];
    if (!level) {
      await ctx.answerCallbackQuery({ text: 'Kurs darajasi topilmadi' });
      return;
    }

    const user = await db.query("SELECT lang FROM users WHERE telegram_id = $1", [ctx.from.id]);
    const lang = user.rows[0]?.lang || 'uz';

    await ctx.reply(locales[lang].group_selected.replace('{level}', level));
    await ctx.answerCallbackQuery();
  });
}

module.exports = bot;