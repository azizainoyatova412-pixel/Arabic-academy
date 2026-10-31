const db = require('../db/index');
const crypto = require('crypto');

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

async function migrateLegacyCurrentMonthGrades(groupId = null) {
  const currentMonth = getCurrentMonthKey();
  await db.query(
    `INSERT INTO public.monthly_grades
       (group_id, telegram_id, month_key, lesson_grades, total_points, updated_at)
     SELECT e.group_id, e.telegram_id, $1,
            COALESCE(e.lesson_grades, '{}'::jsonb),
            COALESCE(e.current_month_points, 0),
            CURRENT_TIMESTAMP
     FROM public.enrollments e
     WHERE ($2::integer IS NULL OR e.group_id = $2)
       AND (
         COALESCE(e.lesson_grades, '{}'::jsonb) <> '{}'::jsonb
         OR COALESCE(e.current_month_points, 0) > 0
       )
       AND NOT EXISTS (
         SELECT 1
         FROM public.monthly_grades existing
         WHERE existing.group_id = e.group_id
           AND existing.telegram_id = e.telegram_id
       )
     ON CONFLICT (group_id, telegram_id, month_key) DO NOTHING`,
    [currentMonth, groupId]
  );
}

async function assignMissingStudentCodes(groupId) {
  await db.query(
    `WITH missing AS (
       SELECT u.telegram_id,
              row_number() OVER (ORDER BY u.full_name, u.telegram_id) AS code_order
       FROM public.users u
       JOIN public.enrollments e ON e.telegram_id = u.telegram_id
       WHERE e.group_id = $1
         AND u.student_code IS NULL
     ),
     available AS (
       SELECT candidate::text AS student_code,
              row_number() OVER (ORDER BY candidate) AS code_order
       FROM generate_series(101, 999) AS candidate
       WHERE NOT EXISTS (
         SELECT 1
         FROM public.users existing
         WHERE existing.student_code = candidate::text
       )
     )
     UPDATE public.users u
     SET student_code = available.student_code
     FROM missing
     JOIN available USING (code_order)
     WHERE u.telegram_id = missing.telegram_id`,
    [groupId]
  );
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
    const accessCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const r = await db.query(
      'INSERT INTO groups (name, access_code) VALUES ($1, $2) RETURNING *',
      [name.trim(), accessCode]
    );
    res.json({ group: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.deleteGroup = async (req, res) => {
  const groupId = Number(req.params.groupId);
  if (!Number.isSafeInteger(groupId) || groupId <= 0) {
    return res.status(400).json({ error: 'Guruh ID noto‘g‘ri' });
  }

  try {
    const deletedGroup = await db.transaction(async (client) => {
      const groupResult = await client.query(
        'SELECT id, name FROM public.groups WHERE id = $1 FOR UPDATE',
        [groupId]
      );
      if (groupResult.rowCount === 0) return null;

      await client.query('DELETE FROM public.monthly_grades WHERE group_id = $1', [groupId]);
      await client.query('DELETE FROM public.payments WHERE group_id = $1', [groupId]);
      await client.query('DELETE FROM public.enrollments WHERE group_id = $1', [groupId]);

      const result = await client.query(
        'DELETE FROM public.groups WHERE id = $1 RETURNING id, name',
        [groupId]
      );
      return result.rows[0] || null;
    });

    if (!deletedGroup) {
      return res.status(404).json({ error: 'Guruh topilmadi' });
    }
    return res.json({ ok: true, group: deletedGroup });
  } catch (error) {
    console.error('deleteGroup xatolik:', error.message);
    return res.status(500).json({ error: 'Guruhni o‘chirishda server xatoligi yuz berdi' });
  }
};

exports.verifyBotGroupCode = async (req, res) => {
  const accessCode = String(req.body.access_code || '').trim().toUpperCase();
  const telegramId = Number(req.body.telegram_id);
  const fullName = String(req.body.full_name || '').trim().slice(0, 120);
  const studentCode = String(req.body.student_code || '').trim();

  if (!accessCode || !Number.isSafeInteger(telegramId) || telegramId <= 0 || !fullName) {
    return res.status(400).json({ error: 'Guruh kodi va o‘quvchi ma’lumotlari kerak' });
  }

  try {
    const groupResult = await db.query(
      `SELECT g.id, g.name, g.access_code, g.book_name, g.book_pdf_path,
              b.id AS book_id, b.title AS book_title
       FROM public.groups g
       LEFT JOIN public.books b ON (b.pdf_path = g.book_pdf_path OR b.title = g.book_name)
       WHERE upper(g.access_code) = $1
       LIMIT 1`,
      [accessCode]
    );
    const group = groupResult.rows[0];
    if (!group) return res.status(404).json({ error: 'Guruh kodi noto‘g‘ri yoki guruh topilmadi' });

    const groupAccess = {
      group: { id: group.id, name: group.name },
      student: null,
      book: group.book_title || group.book_pdf_path
        ? { id: group.book_id || null, title: group.book_title || group.book_name || 'Darslik', pdfPath: group.book_pdf_path }
        : null,
    };
    if (req.body.verify_only === true) {
      return res.json(groupAccess);
    }

    // Agar 3 xonali talaba raqami berilgan bo'lsa, mavjud o'quvchi profiliga bog'laymiz
    let matchedStudent = null;
    if (studentCode) {
      const matchRes = await db.query(
        `SELECT u.telegram_id, u.full_name, u.student_code 
         FROM public.users u
         JOIN public.enrollments e ON e.telegram_id = u.telegram_id
         WHERE u.student_code = $1 AND e.group_id = $2
         LIMIT 1`,
        [studentCode, group.id]
      );
      if (matchRes.rows.length === 0) {
        return res.status(404).json({ error: '3 xonali talaba raqami bu guruhda topilmadi' });
      }

      matchedStudent = matchRes.rows[0];
      const oldTid = Number(matchedStudent.telegram_id);
      if (oldTid !== telegramId) {
        await db.query('UPDATE public.enrollments SET telegram_id = $1 WHERE telegram_id = $2 AND group_id = $3', [telegramId, oldTid, group.id]).catch(() => {});
        await db.query('UPDATE public.monthly_grades SET telegram_id = $1 WHERE telegram_id = $2 AND group_id = $3', [telegramId, oldTid, group.id]).catch(() => {});
        await db.query('UPDATE public.users SET student_code = NULL WHERE telegram_id = $1', [oldTid]).catch(() => {});
      }
    }

    const assignedName = matchedStudent?.full_name || fullName;

    await db.query(
      `INSERT INTO public.users (telegram_id, full_name, lang, language_code, status, academy_group_id, academy_group_name, student_code)
       VALUES ($1, $2, 'uz', 'uz', 'active', $3, $4, $5)
       ON CONFLICT (telegram_id) DO UPDATE SET 
         academy_group_id = EXCLUDED.academy_group_id,
         academy_group_name = EXCLUDED.academy_group_name,
         student_code = COALESCE(public.users.student_code, EXCLUDED.student_code),
         status = 'active'`,
      [telegramId, assignedName, group.id, group.name, studentCode || matchedStudent?.student_code || null]
    );

    await db.query(
      `INSERT INTO public.enrollments (telegram_id, group_id, status, lesson_grades, current_month_points)
       VALUES ($1, $2, 'active', '{}'::jsonb, 0)
       ON CONFLICT (telegram_id, group_id) DO UPDATE SET status = 'active'`,
      [telegramId, group.id]
    );

    return res.json({
      ...groupAccess,
      student: matchedStudent ? { student_code: matchedStudent.student_code, full_name: matchedStudent.full_name } : null,
    });
  } catch (err) {
    console.error('verifyBotGroupCode xatolik:', err.message);
    return res.status(500).json({ error: 'Guruh kodini tekshirib bo‘lmadi' });
  }
};

exports.getBotStudentMembership = async (req, res) => {
  const telegramId = Number(req.body.telegram_id);
  if (!Number.isSafeInteger(telegramId) || telegramId <= 0) {
    return res.status(400).json({ error: 'Telegram ID noto‘g‘ri' });
  }

  try {
    const result = await db.query(
      `SELECT g.id AS group_id, g.name AS group_name, u.full_name, u.student_code
       FROM public.enrollments e
       JOIN public.groups g ON g.id = e.group_id
       JOIN public.users u ON u.telegram_id = e.telegram_id
       WHERE e.telegram_id = $1 AND e.status = 'active'
       ORDER BY e.id
       LIMIT 1`,
      [telegramId]
    );
    const row = result.rows[0];
    return res.json({
      membership: row
        ? {
            group: { id: Number(row.group_id), name: row.group_name },
            fullName: row.full_name,
            studentCode: row.student_code,
          }
        : null,
    });
  } catch (error) {
    console.error('getBotStudentMembership xatolik:', error.message);
    return res.status(500).json({ error: 'O‘quvchi guruhini aniqlab bo‘lmadi' });
  }
};

exports.getStudents = async (req, res) => {
  const { groupId } = req.params;
  const month = req.query.month || getCurrentMonthKey();
  try {
    await migrateLegacyCurrentMonthGrades(groupId);
    await assignMissingStudentCodes(groupId);

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
          COALESCE(u.telegram_id, e.telegram_id) as telegram_id, 
          COALESCE(u.full_name, 'O''quvchi #' || e.telegram_id) as full_name, 
          u.student_code,
          e.status,
          COALESCE(mg.lesson_grades, '{}'::jsonb) as lesson_grades,
          COALESCE(mg.total_points, 0) as current_month_points,
          e.total_points as total_all_time_points
        FROM public.enrollments e
        LEFT JOIN public.users u ON e.telegram_id = u.telegram_id
        LEFT JOIN public.monthly_grades mg ON mg.telegram_id = e.telegram_id AND mg.group_id = e.group_id AND mg.month_key = $2
        WHERE e.group_id = $1
        ORDER BY COALESCE(mg.total_points, 0) DESC, COALESCE(u.full_name, '') ASC`,
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

  try {
    const codeResult = await db.query(
      `SELECT candidate::text AS student_code
       FROM generate_series(101, 999) AS candidate
       WHERE NOT EXISTS (
         SELECT 1 FROM public.users WHERE student_code = candidate::text
       )
       ORDER BY candidate
       LIMIT 1`
    );
    const studentCode = codeResult.rows[0]?.student_code;
    if (!studentCode) {
      return res.status(409).json({ error: '3 xonali o‘quvchi raqamlari tugagan (101–999)' });
    }

    const tid = telegram_id ? parseInt(telegram_id, 10) : (Date.now() + Math.floor(Math.random() * 100000));

    await db.query(
      `INSERT INTO public.users (telegram_id, full_name, student_code, status) 
       VALUES ($1, $2, $3, 'active') 
       ON CONFLICT (telegram_id) DO UPDATE SET full_name = EXCLUDED.full_name, student_code = COALESCE(public.users.student_code, EXCLUDED.student_code)`,
      [tid, full_name, studentCode]
    );

    await db.query(
      `INSERT INTO public.enrollments (telegram_id, group_id, status, lesson_grades, current_month_points) 
       VALUES ($1, $2, 'active', '{}'::jsonb, 0) ON CONFLICT (telegram_id, group_id) DO NOTHING`,
      [tid, groupId]
    );

    await db.query(
      `INSERT INTO public.monthly_grades (group_id, telegram_id, month_key, lesson_grades, total_points) 
       VALUES ($1, $2, $3, '{}'::jsonb, 0) ON CONFLICT (group_id, telegram_id, month_key) DO NOTHING`,
      [groupId, tid, targetMonth]
    ).catch(() => {});

    res.json({ 
      ok: true, 
      student: { 
        telegram_id: tid, 
        full_name, 
        student_code: studentCode, 
        lesson_grades: {}, 
        current_month_points: 0 
      } 
    });
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
    if (targetMonth === getCurrentMonthKey()) {
      await migrateLegacyCurrentMonthGrades(group_id);
    }

    let lessonGrades = {};
    const existing = await db.query(
      `SELECT COALESCE(lesson_grades, '{}'::jsonb) as lesson_grades, total_points 
       FROM monthly_grades WHERE telegram_id = $1 AND group_id = $2 AND month_key = $3`,
      [studentId, group_id, targetMonth]
    );

    if (existing.rowCount > 0 && existing.rows[0].lesson_grades) {
      lessonGrades = existing.rows[0].lesson_grades;
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
    await migrateLegacyCurrentMonthGrades(groupId);
    const result = await db.query(
      `SELECT 
         u.telegram_id, 
         u.full_name, 
         COALESCE(mg.lesson_grades, '{}'::jsonb) as current_lesson_grades
       FROM enrollments e
       JOIN users u ON e.telegram_id = u.telegram_id
       LEFT JOIN monthly_grades mg ON mg.telegram_id = u.telegram_id AND mg.group_id = e.group_id AND mg.month_key = $2
       WHERE e.group_id = $1
       ORDER BY u.full_name ASC`,
      [groupId, month]
    );

    res.json({
      groupId,
      month,
      stats: require('../utils/studentProgress').buildStudentProgress(result.rows),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getDashboardStats = async (_req, res) => {
  try {
    const [summary, groups, results, botSnapshot] = await Promise.all([
      db.query(
        `SELECT
           COUNT(DISTINCT g.id)::int AS group_count,
           COUNT(DISTINCT e.telegram_id)::int AS students,
           COUNT(DISTINCT e.telegram_id) FILTER (WHERE e.status = 'active')::int AS active_students,
           COUNT(*) FILTER (WHERE e.status = 'pending')::int AS pending_enrollments,
           (SELECT COUNT(*)::int FROM reviews WHERE status = 'approved') AS reviews,
           (SELECT COUNT(*)::int FROM reviews WHERE status = 'pending') AS pending_reviews
         FROM groups g
         LEFT JOIN enrollments e ON e.group_id = g.id`
      ),
      db.query(
        `SELECT g.id, g.name, COUNT(DISTINCT e.telegram_id)::int AS students
         FROM groups g
         LEFT JOIN enrollments e ON e.group_id = g.id
         GROUP BY g.id, g.name
         ORDER BY g.name`
      ),
      db.query('SELECT COUNT(*)::int AS count FROM results_showcase'),
      db.query('SELECT stats, updated_at FROM bot_stats_snapshots WHERE id = 1'),
    ]);

    res.json({
      stats: {
        ...summary.rows[0],
        results: results.rows[0].count,
        groups: groups.rows,
        bot: botSnapshot.rows[0]?.stats || null,
        botUpdatedAt: botSnapshot.rows[0]?.updated_at || null,
      },
    });
  } catch (e) {
    console.error('Admin dashboard statistikasini olishda xatolik:', e.message);
    res.status(500).json({ error: 'Statistika ma’lumotlarini olib bo‘lmadi' });
  }
};

exports.getBotStudentStats = async (req, res) => {
  const telegramId = Number(req.body.telegram_id);
  if (!Number.isSafeInteger(telegramId) || telegramId <= 0) {
    return res.status(400).json({ error: 'Telegram ID noto‘g‘ri' });
  }

  const month = getCurrentMonthKey();
  try {
    await migrateLegacyCurrentMonthGrades();
    const result = await db.query(
      `SELECT
         e.group_id,
         g.name AS group_name,
         u.telegram_id,
         u.full_name,
         COALESCE(mg.lesson_grades, '{}'::jsonb) AS current_lesson_grades,
         COALESCE(mg.total_points, 0)::int AS current_month_points,
         COALESCE(e.total_points, 0)::int AS total_points
       FROM enrollments e
       JOIN users u ON u.telegram_id = e.telegram_id
       JOIN groups g ON g.id = e.group_id
       LEFT JOIN monthly_grades mg
         ON mg.telegram_id = e.telegram_id
        AND mg.group_id = e.group_id
        AND mg.month_key = $2
       WHERE e.status = 'active'
         AND e.group_id IN (
           SELECT group_id FROM enrollments
           WHERE telegram_id = $1 AND status = 'active'
         )
       ORDER BY g.name, current_month_points DESC, u.full_name`,
      [telegramId, month]
    );

    const groupsById = new Map();

    for (const row of result.rows) {
      const groupId = Number(row.group_id);
      if (!groupsById.has(groupId)) groupsById.set(groupId, []);
      groupsById.get(groupId).push(row);
    }

    const groups = [];
    for (const [groupId, rows] of groupsById) {
      const ownRow = rows.find((row) => Number(row.telegram_id) === telegramId);
      if (!ownRow) continue;
      const progress = require('../utils/studentProgress').buildStudentProgress(rows);
      const ownProgress = progress.students.find(
        (student) => Number(student.telegram_id) === telegramId
      );
      const ownGrades = (ownRow.current_lesson_grades && typeof ownRow.current_lesson_grades === 'object')
        ? Object.values(ownRow.current_lesson_grades).map(Number).filter((grade) => Number.isFinite(grade) && grade >= 0 && grade <= 5)
        : [];
      const rank = rows.filter(
        (row) => Number(row.current_month_points) > Number(ownRow.current_month_points)
      ).length + 1;

      groups.push({
        groupId,
        groupName: ownRow.group_name,
        rank,
        groupSize: rows.length,
        monthPoints: Number(ownRow.current_month_points) || 0,
        totalPoints: Number(ownRow.total_points) || 0,
        gradedLessons: ownProgress?.gradedLessons || 0,
        averageGrade: ownProgress?.currentAverage ?? (ownGrades.length
          ? Number((ownGrades.reduce((sum, grade) => sum + grade, 0) / ownGrades.length).toFixed(2))
          : null),
        progressDifference: ownProgress?.difference ?? null,
        progressStatus: ownProgress?.status || 'no-data',
        leaderboard: rows.slice(0, 10).map((row) => ({
          telegramId: Number(row.telegram_id),
          fullName: row.full_name,
          rank: rows.filter(
            (candidate) => Number(candidate.current_month_points) > Number(row.current_month_points)
          ).length + 1,
          monthPoints: Number(row.current_month_points) || 0,
        })),
      });
    }

    res.json({ telegramId, groups, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error('Bot o‘quvchi statistikasini olishda xatolik:', e.message);
    res.status(500).json({ error: 'Sayt statistikasini olib bo‘lmadi' });
  }
};

exports.syncBotStats = async (req, res) => {
  const { users, groups, tests, gradedStudents } = req.body;
  const values = [users, groups, tests, gradedStudents];
  if (!values.every((value) => Number.isSafeInteger(value) && value >= 0)) {
    return res.status(400).json({ error: 'Bot statistikasi manfiy bo‘lmagan butun sonlardan iborat bo‘lishi kerak' });
  }

  try {
    await db.query(
      `INSERT INTO bot_stats_snapshots (id, stats, updated_at)
       VALUES (1, $1::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET stats = EXCLUDED.stats, updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify({ users, groups, tests, gradedStudents })]
    );
    return res.json({ ok: true });
  } catch (e) {
    console.warn('Bot statistikasini saqlashda dastlabki urinish xatosi, jadval tekshirilmoqda:', e.message);
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS bot_stats_snapshots (
          id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
          stats JSONB NOT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await db.query(
        `INSERT INTO bot_stats_snapshots (id, stats, updated_at)
         VALUES (1, $1::jsonb, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET stats = EXCLUDED.stats, updated_at = CURRENT_TIMESTAMP`,
        [JSON.stringify({ users, groups, tests, gradedStudents })]
      );
      return res.json({ ok: true });
    } catch (retryErr) {
      console.error('Bot statistikasini sinxronlashda xatolik:', retryErr.message);
      return res.status(500).json({ error: 'Bot statistikasini saqlab bo‘lmadi: ' + retryErr.message });
    }
  }
};
