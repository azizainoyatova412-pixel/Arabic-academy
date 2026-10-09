const db = require('../db/index');

function getCurrentMonthKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

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

exports.deleteGroup = async (req, res) => {
  const { groupId } = req.params;
  const gId = parseInt(groupId, 10);
  const targetId = isNaN(gId) ? groupId : gId;

  try {
    await db.query('DELETE FROM monthly_grades WHERE group_id = $1', [targetId]).catch(() => {});
    await db.query('DELETE FROM enrollments WHERE group_id = $1', [targetId]).catch(() => {});
    await db.query('DELETE FROM payments WHERE group_id = $1', [targetId]).catch(() => {});
    const result = await db.query('DELETE FROM groups WHERE id = $1 RETURNING *', [targetId]);

    res.json({ ok: true, message: 'Guruh muvaffaqiyatli o‘chirildi', group: result.rows[0] || null });
  } catch (e) {
    console.error('deleteGroup xatolik:', e.message);
    res.status(500).json({ error: e.message });
  }
};

// ====== STUDENTS & MONTHLY GRADES ======
exports.getStudents = async (req, res) => {
  const { groupId } = req.params;
  const month = req.query.month || getCurrentMonthKey();
  try {
    // 1. Shu guruhdagi barcha oylar ro'yxati
    const monthsResult = await db.query(
      `SELECT DISTINCT month_key FROM monthly_grades WHERE group_id = $1 ORDER BY month_key DESC`,
      [groupId]
    ).catch(() => ({ rows: [] }));
    
    let recordedMonths = monthsResult.rows.map((r) => r.month_key);
    const currentMonth = getCurrentMonthKey();
    if (!recordedMonths.includes(currentMonth)) {
      recordedMonths.unshift(currentMonth);
    }
    if (!recordedMonths.includes(month)) {
      recordedMonths.push(month);
    }

    // 2. Shu guruh o'quvchilari va ularning tanlangan oydagi baholari
    const r = await db.query(
      `SELECT 
         u.telegram_id, 
         u.full_name, 
         e.status,
         COALESCE(mg.lesson_grades, e.lesson_grades, '{}'::jsonb) as lesson_grades,
         COALESCE(mg.total_points, e.current_month_points, 0) as current_month_points,
         e.total_points as total_all_time_points
       FROM enrollments e
       JOIN users u ON e.telegram_id = u.telegram_id
       LEFT JOIN monthly_grades mg ON mg.telegram_id = u.telegram_id AND mg.group_id = e.group_id AND mg.month_key = $2
       WHERE e.group_id = $1
       ORDER BY COALESCE(mg.total_points, e.current_month_points, 0) DESC, u.full_name ASC`,
      [groupId, month]
    );

    res.json({ 
      students: r.rows,
      selected_month: month,
      available_months: recordedMonths
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.addStudent = async (req, res) => {
  const { groupId } = req.params;
  const { full_name, telegram_id, month_key } = req.body;
  if (!full_name) return res.status(400).json({ error: 'full_name kerak' });
  const targetMonth = month_key || getCurrentMonthKey();
  const tid = telegram_id ? parseInt(telegram_id, 10) : (Date.now() + Math.floor(Math.random() * 100000));

  try {
    await db.query(
      `INSERT INTO users (telegram_id, full_name) VALUES ($1, $2) ON CONFLICT (telegram_id) DO UPDATE SET full_name = EXCLUDED.full_name`,
      [tid, full_name]
    );
    await db.query(
      `INSERT INTO enrollments (telegram_id, group_id, status, lesson_grades, current_month_points) 
       VALUES ($1, $2, 'active', '{}'::jsonb, 0) ON CONFLICT (telegram_id, group_id) DO NOTHING`,
      [tid, groupId]
    );
    await db.query(
      `INSERT INTO monthly_grades (group_id, telegram_id, month_key, lesson_grades, total_points) 
       VALUES ($1, $2, $3, '{}'::jsonb, 0) ON CONFLICT (group_id, telegram_id, month_key) DO NOTHING`,
      [groupId, tid, targetMonth]
    ).catch(() => {});

    res.json({ ok: true, student: { telegram_id: tid, full_name, lesson_grades: {}, current_month_points: 0 } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.updateLessonGrade = async (req, res) => {
  const { studentId } = req.params;
  const { group_id, lesson_num, grade, month_key } = req.body;
  const lNum = parseInt(lesson_num, 10);
  const targetMonth = month_key || getCurrentMonthKey();

  if (!lNum || lNum < 1 || lNum > 12) {
    return res.status(400).json({ error: "Dars raqami 1 dan 12 gacha bo'lishi kerak" });
  }

  const numericGrade = grade === null || grade === '' || grade === undefined ? null : Number(grade);
  if (numericGrade !== null && (!Number.isInteger(numericGrade) || numericGrade < 0 || numericGrade > 5)) {
    return res.status(400).json({ error: "Baho 0 dan 5 gacha bo'lishi kerak" });
  }

  try {
    // 1. Tanlangan oydagi mavjud baholarni olish
    let lessonGrades = {};
    const existing = await db.query(
      `SELECT COALESCE(lesson_grades, '{}'::jsonb) as lesson_grades, total_points 
       FROM monthly_grades WHERE telegram_id = $1 AND group_id = $2 AND month_key = $3`,
      [studentId, group_id, targetMonth]
    ).catch(() => ({ rowCount: 0, rows: [] }));

    if (existing.rowCount > 0 && existing.rows[0].lesson_grades) {
      lessonGrades = existing.rows[0].lesson_grades;
    } else {
      const enroll = await db.query(
        `SELECT COALESCE(lesson_grades, '{}'::jsonb) as lesson_grades FROM enrollments WHERE telegram_id = $1 AND group_id = $2`,
        [studentId, group_id]
      );
      if (enroll.rowCount > 0 && enroll.rows[0].lesson_grades) {
        lessonGrades = enroll.rows[0].lesson_grades;
      }
    }

    if (numericGrade === null) {
      delete lessonGrades[lNum];
      delete lessonGrades[String(lNum)];
    } else {
      lessonGrades[String(lNum)] = numericGrade;
    }

    // 12 ta darsdan yig'ilgan jami ball
    const gradesList = Object.values(lessonGrades).map(Number).filter((n) => Number.isFinite(n) && n >= 0 && n <= 5);
    const totalMonthPoints = gradesList.reduce((acc, curr) => acc + curr, 0);

    // monthly_grades ga yozish / yangilash
    await db.query(
      `INSERT INTO monthly_grades (group_id, telegram_id, month_key, lesson_grades, total_points, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (group_id, telegram_id, month_key)
       DO UPDATE SET lesson_grades = EXCLUDED.lesson_grades, total_points = EXCLUDED.total_points, updated_at = CURRENT_TIMESTAMP`,
      [group_id, studentId, targetMonth, JSON.stringify(lessonGrades), totalMonthPoints]
    );

    // Agar hozirgi oy bo'lsa enrollments ni ham sinxronlash
    if (targetMonth === getCurrentMonthKey()) {
      await db.query(
        `UPDATE enrollments 
         SET lesson_grades = $1, current_month_points = $2, updated_at = CURRENT_TIMESTAMP
         WHERE telegram_id = $3 AND group_id = $4`,
        [JSON.stringify(lessonGrades), totalMonthPoints, studentId, group_id]
      );
    }

    res.json({ ok: true, month_key: targetMonth, lesson_grades: lessonGrades, total_points: totalMonthPoints });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.updateGrade = async (req, res) => {
  const { studentId } = req.params;
  const { group_id, points } = req.body;
  const numericPoints = Number(points);

  if (!Number.isInteger(numericPoints) || numericPoints < 0 || numericPoints > 60) {
    return res.status(400).json({ error: 'Ball 0 dan 60 gacha bo‘lishi kerak' });
  }

  try {
    const result = await db.query(
      `UPDATE enrollments SET current_month_points = $1, total_points = $1, updated_at = CURRENT_TIMESTAMP
       WHERE telegram_id = $2 AND group_id = $3 RETURNING *`,
      [numericPoints, studentId, group_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'O‘quvchi yoki guruh topilmadi' });
    }

    res.json({ ok: true, student: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.deleteStudent = async (req, res) => {
  const { studentId, groupId } = req.params;
  const gId = parseInt(groupId, 10);
  const targetGroupId = isNaN(gId) ? groupId : gId;

  try {
    await db.query('DELETE FROM monthly_grades WHERE telegram_id = $1 AND group_id = $2', [studentId, targetGroupId]).catch(() => {});
    await db.query('DELETE FROM payments WHERE telegram_id = $1 AND group_id = $2', [studentId, targetGroupId]).catch(() => {});
    const result = await db.query(
      `DELETE FROM enrollments
       WHERE telegram_id = $1 AND group_id = $2 RETURNING *`,
      [studentId, targetGroupId]
    );

    res.json({ ok: true, message: 'O‘quvchi guruhdan muvaffaqiyatli o‘chirildi', removed: result.rows[0] || null });
  } catch (e) {
    console.error('deleteStudent xatolik:', e.message);
    res.status(500).json({ error: e.message });
  }
};

exports.getGroupStats = async (req, res) => {
  const { groupId } = req.params;
  const month = req.query.month || getCurrentMonthKey();
  try {
    const previousMonthResult = await db.query(
      `SELECT MAX(month_key) as previous_month
       FROM monthly_grades
       WHERE group_id = $1
         AND month_key < $2
         AND jsonb_object_length(COALESCE(lesson_grades, '{}'::jsonb)) > 0`,
      [groupId, month]
    );
    const previousMonth = previousMonthResult.rows[0].previous_month;
    const result = await db.query(
      `SELECT 
         u.telegram_id, 
         u.full_name, 
         COALESCE(mg.lesson_grades, CASE WHEN $2 = $4 THEN e.lesson_grades END, '{}'::jsonb) as current_lesson_grades,
         COALESCE(previous_mg.lesson_grades, '{}'::jsonb) as previous_lesson_grades
       FROM enrollments e
       JOIN users u ON e.telegram_id = u.telegram_id
       LEFT JOIN monthly_grades mg ON mg.telegram_id = u.telegram_id AND mg.group_id = e.group_id AND mg.month_key = $2
       LEFT JOIN monthly_grades previous_mg ON previous_mg.telegram_id = u.telegram_id
         AND previous_mg.group_id = e.group_id AND previous_mg.month_key = $3
       WHERE e.group_id = $1 AND e.status = 'active'
       ORDER BY u.full_name ASC`,
      [groupId, month, previousMonth, getCurrentMonthKey()]
    );

    res.json({
      groupId,
      month,
      stats: require('../utils/studentProgress').buildStudentProgress(result.rows, previousMonth),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
