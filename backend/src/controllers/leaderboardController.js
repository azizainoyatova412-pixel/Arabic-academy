const db = require('../db/index');

function getCurrentMonthKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return `${year}-${month}`;
}

exports.getLeaderboard = async (req, res) => {
  const { groupId } = req.params;
  try {
    const result = await db.query(
      `SELECT u.telegram_id, u.full_name,
              COALESCE(mg.total_points, 0)::int AS current_month_points,
              e.total_points
       FROM enrollments e
       JOIN users u ON e.telegram_id = u.telegram_id
       LEFT JOIN monthly_grades mg
         ON mg.telegram_id = e.telegram_id
        AND mg.group_id = e.group_id
        AND mg.month_key = $2
       WHERE e.group_id = $1 AND e.status = 'active'
       ORDER BY COALESCE(mg.total_points, 0) DESC, u.full_name
       LIMIT 50`,
      [groupId, getCurrentMonthKey()]
    );
    res.json({ leaderboard: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Serverda xatolik yuz berdi" });
  }
};