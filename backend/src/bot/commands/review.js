const db = require('../../db');

async function reviewCommand(ctx) {
  const text = ctx.message.text.replace(/^\/review\s*/i, '').trim();
  if (!text) {
    return ctx.reply('✍️ Sharhni yuboring: /review <sizning fikringiz>');
  }

  const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'Telegram foydalanuvchi';

  const result = await db.query(
    'INSERT INTO reviews (name, text, stars) VALUES ($1, $2, 5) RETURNING *',
    [name, text]
  );

  await ctx.reply('✅ Sharhingiz saytga yuborildi. Rahmat!');
  return result.rows[0];
}

module.exports = reviewCommand;
