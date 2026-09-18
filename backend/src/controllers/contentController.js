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
    const r = await db.query('SELECT * FROM reviews ORDER BY created_at DESC');
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
      'INSERT INTO reviews (name, text, stars) VALUES ($1, $2, $3) RETURNING *',
      [name, text, stars || 5]
    );
    res.json({ review: r.rows[0] });
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
