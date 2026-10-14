const db = require('../db/index');
const path = require('path');
const fs = require('fs');

// ====== RESULTS ======
exports.getResults = async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM results_showcase ORDER BY created_at DESC');
    res.json({ results: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.addResult = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fayl kerak' });
  const { caption } = req.body;
  try {
    const r = await db.query(
      'INSERT INTO results_showcase (filename, caption) VALUES ($1, $2) RETURNING *',
      [req.file.filename, caption || '']
    );
    res.json({ result: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.deleteResult = async (req, res) => {
  const { id } = req.params;
  try {
    const r = await db.query('SELECT filename FROM results_showcase WHERE id = $1', [id]);
    if (r.rows[0]) {
      const filePath = path.join(__dirname, '../../uploads', r.rows[0].filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.query('DELETE FROM results_showcase WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ====== REVIEWS ======
exports.getReviews = async (req, res) => {
  try {
    const r = await db.query(
      "SELECT * FROM reviews WHERE status = 'approved' ORDER BY created_at DESC"
    );
    res.json({ reviews: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.addReview = async (req, res) => {
  const { name, text, stars } = req.body;
  if (!name || !text) return res.status(400).json({ error: 'name va text kerak' });
  try {
    const r = await db.query(
      "INSERT INTO reviews (name, text, stars, status) VALUES ($1, $2, $3, 'approved') RETURNING *",
      [name, text, stars || 5]
    );
    res.json({ review: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getAdminReviews = async (req, res) => {
  const status = req.query.status || 'all';
  if (!['all', 'pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Sharh holati noto‘g‘ri' });
  }
  try {
    const r = await db.query(
      `SELECT * FROM reviews
       WHERE $1 = 'all' OR status = $1
       ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
                created_at DESC`,
      [status]
    );
    res.json({ reviews: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.submitBotReview = async (req, res) => {
  const { telegram_id, name, text } = req.body;
  if (!Number.isSafeInteger(Number(telegram_id)) || !name?.trim() || !text?.trim()) {
    return res.status(400).json({ error: 'Telegram ID, ism va sharh matni kerak' });
  }
  if (name.trim().length > 150 || text.trim().length > 2000) {
    return res.status(400).json({ error: 'Ism yoki sharh belgilangan uzunlikdan oshdi' });
  }

  try {
    const r = await db.query(
      `INSERT INTO reviews (name, text, stars, status, telegram_id)
       VALUES ($1, $2, 5, 'pending', $3) RETURNING id, status`,
      [name.trim(), text.trim(), String(telegram_id)]
    );
    res.status(201).json({ review: r.rows[0], message: 'Sharh admin tasdig‘ini kutmoqda' });
  } catch (e) {
    console.error('Bot sharhini saqlashda xatolik:', e.message);
    res.status(500).json({ error: 'Sharhni saqlab bo‘lmadi' });
  }
};

exports.updateReviewStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Holat approved yoki rejected bo‘lishi kerak' });
  }
  try {
    const result = await db.query(
      'UPDATE reviews SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Sharh topilmadi' });
    res.json({ review: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.deleteReview = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM reviews WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
