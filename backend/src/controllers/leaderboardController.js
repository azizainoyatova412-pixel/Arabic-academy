const db = require('../db/index');

exports.getLeaderboard = async (req, res) => {
  const { groupId } = req.params;
  try {
    const result = await db.query(
      `SELECT u.telegram_id, u.full_name, e.current_month_points, e.total_points
       FROM enrollments e
       JOIN users u ON e.telegram_id = u.telegram_id
       WHERE e.group_id = $1 AND e.status = 'active'
       ORDER BY e.current_month_points DESC LIMIT 50`,
      [groupId]
    );
    res.json({ leaderboard: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Serverda xatolik yuz berdi" });
  }
};