const { Bot, session } = require('grammy');
const db = require('../db/index');
const startCommand = require('./commands/start');
const locales = require('./menus/locales');
require('dotenv').config();

const bot = new Bot(process.env.BOT_TOKEN);

bot.use(session({ initial: () => ({ selectedGroupId: null }) }));

// Komandalarni ulash
bot.command('start', startCommand);

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

// Guruh tanlash callback handling
bot.callbackQuery(/^choose_group_(\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  ctx.session.selectedGroupId = groupId;

  const user = await db.query("SELECT lang FROM users WHERE telegram_id = $1", [ctx.from.id]);
  const lang = user.rows[0]?.lang || 'uz';

  await ctx.reply(locales[lang].payment_info, { parse_mode: "Markdown" });
  await ctx.answerCallbackQuery();
});

// Chek rasmini qabul qilish va adminga yuborish
bot.on("message:photo", async (ctx) => {
  const groupId = ctx.session.selectedGroupId;
  if (!groupId) return ctx.reply("❌ Iltimos, avval darajani tanlang.");

  const telegramId = ctx.from.id;
  const photoFileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;

  await db.query("INSERT INTO payments (telegram_id, group_id, check_file_id) VALUES ($1, $2, $3)", [telegramId, groupId, photoFileId]);
  await db.query(
    "INSERT INTO enrollments (telegram_id, group_id, status) VALUES ($1, $2, 'pending') ON CONFLICT (telegram_id, group_id) DO UPDATE SET status = 'pending'",
    [telegramId, groupId]
  );

  await ctx.api.sendPhoto(process.env.ADMIN_TELEGRAM_ID, photoFileId, {
    caption: ` 🔔 **Yangi to'lov cheki!**\n👤 O'quvchi: ${ctx.from.first_name}\n🆔 ID: ${telegramId}\n📚 Guruh ID: ${groupId}`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Tasdiqlash", callback_data: `approve_${telegramId}_${groupId}` },
          { text: "❌ Rad etish", callback_data: `reject_${telegramId}_${groupId}` }
        ]
      ]
    }
  });

  const user = await db.query("SELECT lang FROM users WHERE telegram_id = $1", [telegramId]);
  ctx.session.selectedGroupId = null;
  await ctx.reply(locales[user.rows[0].lang].check_received);
});

// Admin callback action handler
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (data.startsWith("approve_") || data.startsWith("reject_")) {
    const [action, studentId, groupId] = data.split("_");
    if (action === "approve") {
      await db.query("UPDATE enrollments SET status = 'active' WHERE telegram_id = $1 AND group_id = $2", [studentId, groupId]);
      await db.query("UPDATE payments SET status = 'approved' WHERE telegram_id = $1 AND group_id = $2", [studentId, groupId]);
      const inviteLink = await ctx.api.createChatInviteLink(process.env.TELEGRAM_GROUP_ID, { member_limit: 1 });
      await ctx.api.sendMessage(studentId, `🎉 **To'lovingiz tasdiqlandi!**\n\nQuyidagi havola orqali guruhga qo'shiling:\n👉 ${inviteLink.invite_link}`);
      await ctx.editMessageCaption({ caption: "✅ Tasdiqlandi va havola yuborildi." });
    } else {
      await db.query("UPDATE enrollments SET status = 'rejected' WHERE telegram_id = $1 AND group_id = $2", [studentId, groupId]);
      await db.query("UPDATE payments SET status = 'rejected' WHERE telegram_id = $1 AND group_id = $2", [studentId, groupId]);
      await ctx.api.sendMessage(studentId, "❌ Kechirasiz, siz yuborgan chek tasdiqlanmadi.");
      await ctx.editMessageCaption({ caption: "❌ Chek rad etildi." });
    }
  }
  await ctx.answerCallbackQuery();
});

module.exports = bot;