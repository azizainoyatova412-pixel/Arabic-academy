const db = require('../db/index');
const path = require('path');
const fs = require('fs');

// ====== RESULTS ======
exports.getResults = async (req, res) => {
  try {
    const r = await db.query(
      `SELECT id, filename, caption, created_at, image_data IS NOT NULL AS has_image
       FROM results_showcase ORDER BY created_at DESC`
    );
    res.json({ results: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getResultImage = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Natija ID raqami noto‘g‘ri' });
  }

  try {
    const result = await db.query(
      'SELECT image_data, image_content_type FROM results_showcase WHERE id = $1',
      [id]
    );
    const image = result.rows[0];
    if (!image?.image_data) return res.status(404).json({ error: 'Natija rasmi topilmadi' });

    res.set('Content-Type', image.image_content_type);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(image.image_data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.addResult = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Natija rasmi kerak' });
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedImageTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Faqat JPEG, PNG yoki WebP rasmlarini yuborish mumkin' });
  }

  const caption = typeof req.body.caption === 'string' ? req.body.caption.trim() : '';
  if (caption.length > 500) {
    return res.status(400).json({ error: 'Izoh 500 belgidan oshmasligi kerak' });
  }

  try {
    const result = await db.query(
      `INSERT INTO results_showcase (filename, image_data, image_content_type, caption)
       VALUES (NULL, $1, $2, $3) RETURNING id, filename, caption, created_at`,
      [req.file.buffer, req.file.mimetype, caption]
    );
    res.status(201).json({ result: { ...result.rows[0], has_image: true } });
  } catch (e) {
    console.error('Natijani saqlashda xatolik:', e.message);
    res.status(500).json({ error: 'Natijani saqlab bo‘lmadi' });
  }
};

exports.deleteResult = async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM results_showcase WHERE id = $1 RETURNING filename',
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Natija topilmadi' });

    const filename = result.rows[0]?.filename;
    if (filename) {
      const filePath = path.join(__dirname, '../../uploads', path.basename(filename));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
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
