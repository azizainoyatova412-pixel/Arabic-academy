const db = require('../db/index');

// ====== GROUPS ======
exports.getGroups = async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM groups ORDER BY created_at DESC');
    res.json({ groups: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.createGroup = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name kerak' });
  try {
    const r = await db.query('INSERT INTO groups (name) VALUES ($1) RETURNING *', [name]);
    res.json({ group: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ====== STUDENTS ======
exports.getStudents = async (req, res) => {
  const { groupId } = req.params;
  try {
    const r = await db.query(
      `SELECT u.telegram_id, u.full_name, e.current_month_points, e.total_points, e.status
       FROM enrollments e
       JOIN users u ON e.telegram_id = u.telegram_id
       WHERE e.group_id = $1
       ORDER BY e.current_month_points DESC`,
      [groupId]
    );
    res.json({ students: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.addStudent = async (req, res) => {
  const { groupId } = req.params;
  const { full_name, telegram_id } = req.body;
  if (!full_name) return res.status(400).json({ error: 'full_name kerak' });
  // Auto-generate telegram_id if not provided
  const tid = telegram_id || Date.now();
  try {
    await db.query(
      `INSERT INTO users (telegram_id, full_name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [tid, full_name]
    );
    await db.query(
      `INSERT INTO enrollments (telegram_id, group_id, status) VALUES ($1, $2, 'active') ON CONFLICT DO NOTHING`,
      [tid, groupId]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.updateGrade = async (req, res) => {
  const { studentId } = req.params;
  const { group_id, points } = req.body;
  try {
    await db.query(
      `UPDATE enrollments SET current_month_points = $1, updated_at = CURRENT_TIMESTAMP
       WHERE telegram_id = $2 AND group_id = $3`,
      [points, studentId, group_id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
