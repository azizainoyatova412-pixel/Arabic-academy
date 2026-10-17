"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const index_js_1 = require("../db/index.js");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const pdfBook_js_1 = require("../services/pdfBook.js");
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const dir = path_1.default.join(process.cwd(), 'uploads', 'books');
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'book-' + uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});
exports.apiRouter = (0, express_1.Router)();
// ==========================================
// 1. STATISTIKA VA REYTING (Band 3 & 10)
// ==========================================
exports.apiRouter.get('/stats', async (req, res) => {
    try {
        const totalUsersRes = await index_js_1.db.query('SELECT COUNT(*) as count FROM users');
        const totalGroupsRes = await index_js_1.db.query('SELECT COUNT(*) as count FROM groups');
        const paidUsersRes = await index_js_1.db.query('SELECT COUNT(*) as count FROM users WHERE is_paid = TRUE');
        const gradedUsersRes = await index_js_1.db.query('SELECT COUNT(*) as count FROM users WHERE grade IS NOT NULL AND grade > 0');
        // Guruhlar va ularning o'quvchilari statistikasi
        const groupsStats = await index_js_1.db.query(`SELECT g.id, g.name, g.access_code,
        COUNT(u.id) as student_count,
        ROUND(AVG(COALESCE(u.grade, 0)), 1) as avg_grade,
        SUM(CASE WHEN u.is_paid = TRUE THEN 1 ELSE 0 END) as paid_count
       FROM groups g
       LEFT JOIN users u ON u.joined_group_id = g.id
       GROUP BY g.id, g.name, g.access_code
       ORDER BY g.id ASC`);
        res.json({
            success: true,
            stats: {
                totalUsers: Number(totalUsersRes.rows[0]?.count || 0),
                totalGroups: Number(totalGroupsRes.rows[0]?.count || 0),
                paidUsers: Number(paidUsersRes.rows[0]?.count || 0),
                unpaidUsers: Math.max(0, Number(totalUsersRes.rows[0]?.count || 0) - Number(paidUsersRes.rows[0]?.count || 0)),
                gradedUsers: Number(gradedUsersRes.rows[0]?.count || 0),
            },
            groupsStats: groupsStats.rows,
        });
    }
    catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ success: false, message: "Statistika ma'lumotlarini yuklashda xatolik" });
    }
});
// ==========================================
// 2. GURUHLAR NAZORATI (Band 10: Guruh yaratish, o'chirish, kod qo'yish)
// ==========================================
exports.apiRouter.get('/groups', async (req, res) => {
    try {
        const result = await index_js_1.db.query(`SELECT g.*, 
        (SELECT COUNT(*) FROM users u WHERE u.joined_group_id = g.id) as members_count,
        (SELECT ROUND(AVG(grade), 1) FROM users u WHERE u.joined_group_id = g.id AND u.grade IS NOT NULL) as avg_grade
       FROM groups g
       ORDER BY g.id DESC`);
        res.json({ success: true, data: result.rows });
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Guruhlarni yuklashda xatolik" });
    }
});
exports.apiRouter.post('/groups', async (req, res) => {
    try {
        const { name, access_code, telegram_invite_link, description, book_name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, message: "Guruh nomi kiritilishi shart!" });
        }
        if (!access_code || access_code.trim() === '') {
            return res.status(400).json({ success: false, message: "Kirish kodi kiritilishi shart!" });
        }
        const codeCheck = await index_js_1.db.query('SELECT id FROM groups WHERE UPPER(access_code) = UPPER($1)', [access_code.trim()]);
        if (codeCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: "Bu kirish kodi boshqa guruhda allaqachon mavjud!" });
        }
        const insertRes = await index_js_1.db.query(`INSERT INTO groups (name, access_code, telegram_invite_link, description, book_name, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id`, [name.trim(), access_code.trim().toUpperCase(), telegram_invite_link?.trim() || null, description?.trim() || null, book_name?.trim() || null]);
        res.json({ success: true, message: "Guruh muvaffaqiyatli yaratildi!", id: insertRes.rows[0]?.id });
    }
    catch (err) {
        console.error('Create group error:', err);
        res.status(500).json({ success: false, message: "Guruh yaratishda server xatosi" });
    }
});
exports.apiRouter.put('/groups/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { name, access_code, telegram_invite_link, description, book_name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, message: "Guruh nomi bo'sh bo'lishi mumkin emas!" });
        }
        if (!access_code || access_code.trim() === '') {
            return res.status(400).json({ success: false, message: "Guruh kodi bo'sh bo'lishi mumkin emas!" });
        }
        const codeCheck = await index_js_1.db.query('SELECT id FROM groups WHERE UPPER(access_code) = UPPER($1) AND id != $2', [access_code.trim(), id]);
        if (codeCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: "Bu kod boshqa guruh tomonidan band qilingan!" });
        }
        await index_js_1.db.query(`UPDATE groups 
       SET name = $1, access_code = $2, telegram_invite_link = $3, description = $4, book_name = $5
       WHERE id = $6`, [name.trim(), access_code.trim().toUpperCase(), telegram_invite_link || null, description || null, book_name?.trim() || null, id]);
        res.json({ success: true, message: "Guruh ma'lumotlari muvaffaqiyatli saqlandi!" });
    }
    catch (err) {
        console.error('Update group error:', err);
        res.status(500).json({ success: false, message: "Guruhni yangilashda xatolik" });
    }
});
exports.apiRouter.delete('/groups/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        await index_js_1.db.transaction(async (trx) => {
            await trx.query('UPDATE users SET joined_group_id = NULL WHERE joined_group_id = $1', [id]);
            await trx.query('DELETE FROM groups WHERE id = $1', [id]);
        });
        res.json({ success: true, message: "Guruh muvaffaqiyatli o'chirildi!" });
    }
    catch (err) {
        console.error('Delete group error:', err);
        res.status(500).json({ success: false, message: "Guruhni o'chirishda xatolik" });
    }
});
// Guruhga PDF kitob yuklash va mavzularni ajratish
exports.apiRouter.post('/groups/:id/upload-book', upload.any(), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const grpRes = await index_js_1.db.query('SELECT * FROM groups WHERE id = $1', [id]);
        if (grpRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Guruh topilmadi" });
        }
        const files = req.files || [];
        const file = files[0] || req.file;
        if (!file) {
            return res.status(400).json({ success: false, message: "PDF fayli tanlanmadi!" });
        }
        const filePath = file.path;
        const relPath = '/uploads/books/' + path_1.default.basename(filePath);
        const bookName = req.body.book_name || grpRes.rows[0].book_name || file.originalname.replace(/\.pdf$/i, '');
        // PDF dan matn ajratish
        const text = await pdfBook_js_1.PdfBookService.extractTextFromPdf(filePath);
        // Mavzular ketma-ketligini tuzish
        const topics = await pdfBook_js_1.PdfBookService.generateTopicsFromBook(bookName, text);
        // Guruhga kitobni alohida (izolyatsiyalangan) biriktirish
        await index_js_1.db.query(`UPDATE groups 
       SET book_name = $1, book_pdf_path = $2, book_text = $3, book_topics = $4
       WHERE id = $5`, [bookName, relPath, text, JSON.stringify(topics), id]);
        // Kutubxona (books) jadvaliga ham qo'shib qo'yish
        try {
            const stats = fs_1.default.statSync(filePath);
            await index_js_1.db.query(`INSERT INTO books (title, pdf_path, file_size, text_content, topics, topics_count)
         VALUES ($1, $2, $3, $4, $5, $6)`, [bookName, relPath, stats.size || 0, text, JSON.stringify(topics), topics.length]);
        }
        catch { }
        res.json({
            success: true,
            message: `✅ "${bookName}" kitobi faqat ushbu guruhga muvaffaqiyatli biriktirildi (${topics.length} ta dars mavzusi)!`,
            book_name: bookName,
            book_pdf_path: relPath,
            topics,
            topicsCount: topics.length,
        });
        return;
    }
    catch (err) {
        console.error('Upload book error:', err);
        res.status(500).json({ success: false, message: "Kitobni yuklashda xatolik: " + err.message });
    }
});
// Guruh mavzularini saqlash / tahrirlash
exports.apiRouter.post('/groups/:id/topics', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { topics } = req.body;
        if (!Array.isArray(topics)) {
            return res.status(400).json({ success: false, message: "Mavzular massiv bo'lishi kerak" });
        }
        await index_js_1.db.query('UPDATE groups SET book_topics = $1 WHERE id = $2', [JSON.stringify(topics), id]);
        res.json({ success: true, message: "Dars mavzulari muvaffaqiyatli saqlandi!" });
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Mavzularni saqlashda xatolik" });
    }
});
// ==========================================
// 3. O'QUVCHILAR VA BAHOLASH (Band 5: Dublikat yo'q, reyting bo'yicha saralangan; Band 6: To'planib boradigan baho)
// ==========================================
// 3. O'QUVCHILAR VA BAHOLASH (Kumulyativ jamlangan ballar, sana bo'yicha baholash)
// ==========================================
exports.apiRouter.get('/system/time', (req, res) => {
    const today = (0, index_js_1.getTashkentDate)();
    const d = new Date();
    const formatter = new Intl.DateTimeFormat('uz-UZ', {
        timeZone: 'Asia/Tashkent',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    res.json({
        success: true,
        date: today,
        formattedDate: formatter.format(d),
    });
});
exports.apiRouter.get('/students', async (req, res) => {
    try {
        const today = (0, index_js_1.getTashkentDate)();
        const result = await index_js_1.db.query(`SELECT u.id, u.telegram_id, u.first_name, u.username, u.joined_group_id, u.is_paid, u.created_at,
        g.name as group_name, g.access_code as group_access_code,
        COALESCE(SUM(sg.grade), 0) as total_score,
        COUNT(sg.id) as grades_count,
        COALESCE(ROUND(AVG(sg.grade), 1), 0) as avg_grade,
        MAX(CASE WHEN sg.grade_date = $1 THEN sg.grade ELSE NULL END) as today_grade,
        COALESCE(usp.current_topic_index, 1) as current_topic_index,
        COALESCE(usp.last_topic_passed, 0) as last_topic_passed,
        COALESCE(usp.step_state, 'learning') as study_step_state
       FROM users u
       LEFT JOIN groups g ON u.joined_group_id = g.id
       LEFT JOIN student_grades sg ON sg.user_id = u.id
       LEFT JOIN user_study_progress usp ON usp.telegram_id = u.telegram_id
       GROUP BY u.id, u.telegram_id, u.first_name, u.username, u.joined_group_id, u.is_paid, u.created_at, g.name, g.access_code, usp.current_topic_index, usp.last_topic_passed, usp.step_state
       ORDER BY total_score DESC, avg_grade DESC, u.id ASC`, [today]);
        res.json({ success: true, today, data: result.rows });
    }
    catch (err) {
        console.error('Fetch students error:', err);
        res.status(500).json({ success: false, message: "O'quvchilarni yuklashda xatolik" });
    }
});
// O'quvchining AI Ustoz dars mavzusini o'zgartirish
exports.apiRouter.post('/students/:id/set-topic', async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        const { topicNumber } = req.body;
        const num = Math.max(1, parseInt(topicNumber, 10) || 1);
        const userRes = await index_js_1.db.query('SELECT id, telegram_id, joined_group_id FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "O'quvchi topilmadi" });
        }
        const user = userRes.rows[0];
        const progCheck = await index_js_1.db.query('SELECT id FROM user_study_progress WHERE telegram_id = $1', [user.telegram_id]);
        if (progCheck.rows.length > 0) {
            await index_js_1.db.query(`UPDATE user_study_progress 
         SET current_topic_index = $1, step_state = 'learning', review_fail_count = 0, updated_at = CURRENT_TIMESTAMP
         WHERE telegram_id = $2`, [num, user.telegram_id]);
        }
        else {
            await index_js_1.db.query(`INSERT INTO user_study_progress (user_id, telegram_id, group_id, current_topic_index, step_state)
         VALUES ($1, $2, $3, $4, 'learning')`, [user.id, user.telegram_id, user.joined_group_id, num]);
        }
        res.json({ success: true, message: `✅ O'quvchi darsi ${num}-mavzuga belgilandi!` });
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Mavzuni o'zgartirishda xatolik" });
    }
});
// O'quvchining baholar tarixini olish
exports.apiRouter.get('/students/:id/grades', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const result = await index_js_1.db.query('SELECT id, grade, grade_date, lesson_title, created_at FROM student_grades WHERE user_id = $1 ORDER BY grade_date DESC, id DESC', [id]);
        res.json({ success: true, data: result.rows });
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Baholar tarixini yuklashda xatolik" });
    }
});
// Yangi o'quvchi qo'shish
exports.apiRouter.post('/students', async (req, res) => {
    try {
        const { first_name, username, joined_group_id, grade, is_paid } = req.body;
        if (!first_name || first_name.trim() === '') {
            return res.status(400).json({ success: false, message: "O'quvchi ismi kiritilishi shart!" });
        }
        const cleanGrade = grade ? Math.min(5, Math.max(1, parseInt(grade, 10))) : null;
        const fakeTelegramId = Date.now(); // Qo'lda kiritilgan o'quvchi uchun
        const insertRes = await index_js_1.db.query(`INSERT INTO users (telegram_id, first_name, username, joined_group_id, grade, is_paid, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active') RETURNING id`, [fakeTelegramId, first_name.trim(), username?.replace('@', '').trim() || null, joined_group_id || null, cleanGrade || 0, Boolean(is_paid)]);
        const newUserId = insertRes.rows[0]?.id;
        if (newUserId && cleanGrade) {
            const today = (0, index_js_1.getTashkentDate)();
            await index_js_1.db.query('INSERT INTO student_grades (user_id, grade, grade_date, lesson_title) VALUES ($1, $2, $3, $4)', [newUserId, cleanGrade, today, 'Dastlabki baho']);
        }
        res.json({ success: true, message: "O'quvchi muvaffaqiyatli qo'shildi!" });
    }
    catch (err) {
        console.error('Create student error:', err);
        res.status(500).json({ success: false, message: "O'quvchi qo'shishda xatolik yuz berdi" });
    }
});
// Baho qo'yish (Sana bo'yicha, har bir kunga 1 marta, jamlab hisoblanadi, o'zgartirib bo'lmaydi)
exports.apiRouter.post('/students/:id/grade', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { grade, lesson_title } = req.body;
        const score = grade ? Math.min(5, Math.max(1, parseInt(grade, 10))) : null;
        if (!score) {
            return res.status(400).json({ success: false, message: "Baho 1 dan 5 gacha bo'lishi kerak!" });
        }
        const today = (0, index_js_1.getTashkentDate)();
        // Bugun baho qo'yilganmi tekshiramiz
        const todayGradeRes = await index_js_1.db.query('SELECT id, grade FROM student_grades WHERE user_id = $1 AND grade_date = $2', [id, today]);
        if (todayGradeRes.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Bugungi sana (${today}) uchun bu o'quvchiga allaqachon baho (⭐️ ${todayGradeRes.rows[0].grade}) qo'yilgan! Qoidaga ko'ra, qo'yilgan bahoni o'zgartirib bo'lmaydi.`,
            });
        }
        // Yangi baho qo'shamiz
        await index_js_1.db.query('INSERT INTO student_grades (user_id, grade, grade_date, lesson_title) VALUES ($1, $2, $3, $4)', [id, score, today, lesson_title || 'Kundalik dars']);
        // O'quvchining jamlangan ballini (total_score) hisoblaymiz
        const statsRes = await index_js_1.db.query('SELECT COALESCE(SUM(grade), 0) as total, COUNT(id) as count, ROUND(AVG(grade), 1) as avg_grade FROM student_grades WHERE user_id = $1', [id]);
        const totalScore = Number(statsRes.rows[0]?.total) || score;
        const totalCount = Number(statsRes.rows[0]?.count) || 1;
        const avgGrade = Number(statsRes.rows[0]?.avg_grade) || score;
        await index_js_1.db.query('UPDATE users SET grade = $1 WHERE id = $2', [totalScore, id]);
        res.json({
            success: true,
            message: `Yangi baho (⭐️ ${score}) qo'shildi! Jami to'plangan: ${totalScore} ball (Baholar soni: ${totalCount} ta).`,
            grade: avgGrade,
            todayGrade: score,
            totalScore,
            gradesCount: totalCount,
        });
    }
    catch (err) {
        console.error('Grade error:', err);
        res.status(500).json({ success: false, message: "Baholashda xatolik yuz berdi" });
    }
});
// Guruhini yoki ismini yangilash
exports.apiRouter.put('/students/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { first_name, username, joined_group_id, grade, is_paid } = req.body;
        if (!first_name || first_name.trim() === '') {
            return res.status(400).json({ success: false, message: "Ism bo'sh bo'lishi mumkin emas!" });
        }
        const cleanGrade = grade ? Math.min(5, Math.max(1, parseInt(grade, 10))) : null;
        await index_js_1.db.query(`UPDATE users 
       SET first_name = $1, username = $2, joined_group_id = $3, grade = $4, is_paid = $5
       WHERE id = $6`, [first_name.trim(), username?.replace('@', '').trim() || null, joined_group_id || null, cleanGrade, Boolean(is_paid), id]);
        res.json({ success: true, message: "O'quvchi ma'lumotlari yangilandi!" });
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Yangilashda xatolik" });
    }
});
// O'quvchini o'chirish
exports.apiRouter.delete('/students/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        await index_js_1.db.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ success: true, message: "O'quvchi muvaffaqiyatli o'chirildi!" });
    }
    catch (err) {
        res.status(500).json({ success: false, message: "O'chirishda xatolik" });
    }
});
// ==========================================
// 4. TO'LOVLAR BO'LIMI — TOZA RO'YXAT (Band 6)
// Barcha foydalanuvchilar bitta toza ro'yxatda:
// Ism | Guruh | To'lov holati (✅ To'lagan / ❌ To'lamagan) | [Holatni almashtirish tugmasi]
// (Telegram ID butunlay olib tashlangan!)
// ==========================================
exports.apiRouter.get('/payments', async (req, res) => {
    try {
        const result = await index_js_1.db.query(`SELECT u.id, u.first_name, u.username, u.is_paid,
        COALESCE(g.name, 'Guruhsiz') as group_name
       FROM users u
       LEFT JOIN groups g ON u.joined_group_id = g.id
       ORDER BY u.id DESC`);
        res.json({ success: true, data: result.rows });
    }
    catch (err) {
        res.status(500).json({ success: false, message: "To'lovlar ro'yxatini yuklashda xatolik" });
    }
});
// To'lov holatini almashtirish (Toggle)
exports.apiRouter.post('/payments/:userId/toggle', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        const userRes = await index_js_1.db.query('SELECT id, first_name, is_paid FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi!" });
        }
        const currentPaid = Boolean(userRes.rows[0].is_paid);
        const newPaidStatus = !currentPaid;
        await index_js_1.db.query('UPDATE users SET is_paid = $1 WHERE id = $2', [newPaidStatus, userId]);
        res.json({
            success: true,
            message: newPaidStatus
                ? `✅ "${userRes.rows[0].first_name}" uchun to'lov qabul qilindi deb belgilandi!`
                : `❌ "${userRes.rows[0].first_name}" uchun to'lov to'lanmagan deb belgilandi.`,
            is_paid: newPaidStatus,
        });
    }
    catch (err) {
        console.error('Toggle payment error:', err);
        res.status(500).json({ success: false, message: "To'lov holatini o'zgartirishda xatolik" });
    }
});
// ==========================================
// 5. TEST TIZIMI SOZLAMALARI (Band 5)
// ==========================================
exports.apiRouter.get('/test-settings', async (req, res) => {
    try {
        const resRow = await index_js_1.db.query('SELECT * FROM test_settings ORDER BY id DESC LIMIT 1');
        const settings = resRow.rows[0] || {
            test_book_name: 'Arab tili asoslari',
            test_topics_selection: 'all',
            test_question_types: '["auto"]',
            test_questions_count: 5,
            test_daily_limit: 1,
        };
        res.json({
            success: true,
            settings,
            data: {
                book_name: settings.test_book_name || '',
                book_pdf_path: settings.test_book_pdf_path || '',
                book_text: settings.test_book_text || '',
                selected_topics: settings.test_topics_selection || 'all',
                question_types: settings.test_question_types || '["auto"]',
                question_count: settings.test_questions_count || 5,
                test_daily_limit: settings.test_daily_limit !== undefined ? settings.test_daily_limit : 1,
            },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Test sozlamalarini yuklashda xatolik" });
    }
});
exports.apiRouter.post('/test-settings', async (req, res) => {
    try {
        const bookName = req.body.test_book_name || req.body.book_name;
        const topicsSelection = req.body.test_topics_selection || req.body.selected_topics || 'all';
        const qTypes = req.body.test_question_types || req.body.question_types || ['auto'];
        const qCountRaw = req.body.test_questions_count || req.body.question_count;
        const limitRaw = req.body.test_daily_limit !== undefined ? req.body.test_daily_limit : req.body.daily_limit;
        const count = Math.max(1, parseInt(qCountRaw, 10) || 5);
        const limit = parseInt(limitRaw, 10);
        const existing = await index_js_1.db.query('SELECT id FROM test_settings LIMIT 1');
        if (existing.rows.length > 0) {
            await index_js_1.db.query(`UPDATE test_settings 
         SET test_book_name = COALESCE($1, test_book_name),
             test_topics_selection = $2,
             test_question_types = $3, 
             test_questions_count = $4,
             test_daily_limit = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6`, [
                bookName || null,
                topicsSelection,
                typeof qTypes === 'string' ? qTypes : JSON.stringify(qTypes),
                count,
                isNaN(limit) ? 1 : limit,
                existing.rows[0].id,
            ]);
        }
        else {
            await index_js_1.db.query(`INSERT INTO test_settings (test_book_name, test_topics_selection, test_question_types, test_questions_count, test_daily_limit)
         VALUES ($1, $2, $3, $4, $5)`, [
                bookName || 'Arab tili darsligi',
                topicsSelection,
                typeof qTypes === 'string' ? qTypes : JSON.stringify(qTypes),
                count,
                isNaN(limit) ? 1 : limit,
            ]);
        }
        res.json({ success: true, message: "Test sozlamalari muvaffaqiyatli saqlandi!" });
    }
    catch (err) {
        console.error('Update test settings error:', err);
        res.status(500).json({ success: false, message: "Test sozlamalarini saqlashda xatolik" });
    }
});
// Kutubxonadan test uchun kitob biriktirish
exports.apiRouter.post('/test-settings/attach-book', async (req, res) => {
    try {
        const { bookId } = req.body;
        if (!bookId) {
            return res.status(400).json({ success: false, error: "Kitob ID si ko'rsatilmadi" });
        }
        const bRes = await index_js_1.db.query('SELECT * FROM books WHERE id = $1', [bookId]);
        if (bRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Kitob topilmadi" });
        }
        const book = bRes.rows[0];
        const existing = await index_js_1.db.query('SELECT id FROM test_settings LIMIT 1');
        if (existing.rows.length > 0) {
            await index_js_1.db.query(`UPDATE test_settings 
         SET test_book_name = $1, test_book_pdf_path = $2, test_book_text = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`, [book.title, book.pdf_path, book.text_content, existing.rows[0].id]);
        }
        else {
            await index_js_1.db.query(`INSERT INTO test_settings (test_book_name, test_book_pdf_path, test_book_text)
         VALUES ($1, $2, $3)`, [book.title, book.pdf_path, book.text_content]);
        }
        res.json({
            success: true,
            message: `"${book.title}" kitobi test darsligi sifatida biriktirildi!`,
            book_name: book.title,
            book_pdf_path: book.pdf_path,
            textLength: book.text_content?.length || 0,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Test bo'limi uchun PDF kitob yuklash
exports.apiRouter.post('/test-settings/upload-book', upload.any(), async (req, res) => {
    try {
        const files = req.files || [];
        const file = files[0] || req.file;
        if (!file) {
            return res.status(400).json({ success: false, message: "PDF fayli tanlanmadi!" });
        }
        const filePath = file.path;
        const relPath = '/uploads/books/' + path_1.default.basename(filePath);
        const bookName = req.body.book_name || file.originalname.replace(/\.pdf$/i, '');
        const text = await pdfBook_js_1.PdfBookService.extractTextFromPdf(filePath);
        const topics = await pdfBook_js_1.PdfBookService.generateTopicsFromBook(bookName, text);
        const existing = await index_js_1.db.query('SELECT id FROM test_settings LIMIT 1');
        if (existing.rows.length > 0) {
            await index_js_1.db.query(`UPDATE test_settings 
         SET test_book_name = $1, test_book_pdf_path = $2, test_book_text = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`, [bookName, relPath, text, existing.rows[0].id]);
        }
        else {
            await index_js_1.db.query(`INSERT INTO test_settings (test_book_name, test_book_pdf_path, test_book_text)
         VALUES ($1, $2, $3)`, [bookName, relPath, text]);
        }
        // Kutubxona jadvaliga ham saqlash
        try {
            const stats = fs_1.default.statSync(filePath);
            await index_js_1.db.query(`INSERT INTO books (title, pdf_path, file_size, text_content, topics, topics_count)
         VALUES ($1, $2, $3, $4, $5, $6)`, [bookName, relPath, stats.size || 0, text, JSON.stringify(topics), topics.length]);
        }
        catch { }
        res.json({
            success: true,
            message: `✅ Test bo'limi uchun "${bookName}" kitobi muvaffaqiyatli yuklandi!`,
            test_book_name: bookName,
            test_book_pdf_path: relPath,
            textLength: text.length,
        });
    }
    catch (err) {
        console.error('Test book upload error:', err);
        res.status(500).json({ success: false, message: "Kitob yuklashda xatolik: " + err.message });
    }
});
// ==========================================
// 6. O'TOLMAGAN MAVZULAR VA BILDIRISHNOMALAR (Band 1 talabi: soxta emas, faqat real va o'qildi tugmasi bilan)
// ==========================================
exports.apiRouter.get('/failed-alerts', async (req, res) => {
    try {
        const alerts = await index_js_1.db.query(`SELECT * FROM student_failed_alerts 
       WHERE (is_read IS NULL OR is_read = FALSE) 
         AND status != 'read' 
         AND student_name NOT LIKE '%Test%'
       ORDER BY id DESC`);
        res.json({ success: true, data: alerts.rows });
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Bildirishnomalarni yuklashda xatolik" });
    }
});
// Xabarni o'qildi deb belgilash va o'chirish
exports.apiRouter.post('/failed-alerts/:id/read', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        await index_js_1.db.query(`UPDATE student_failed_alerts SET is_read = TRUE, status = 'read', resolved_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
        res.json({ success: true, message: "Xabarnoma o'qildi deb belgilandi va ro'yxatdan olib tashlandi" });
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Xatolik: " + err.message });
    }
});
// Xabarni butunlay o'chirish
exports.apiRouter.delete('/failed-alerts/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        await index_js_1.db.query('DELETE FROM student_failed_alerts WHERE id = $1', [id]);
        res.json({ success: true, message: "Xabarnoma o'chirildi" });
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Xatolik: " + err.message });
    }
});
// Admin o'quvchi uchun qayta boshlash mavzusini belgilaydi
exports.apiRouter.post('/failed-alerts/:id/restart', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { restartTopic, restartTopicNumber } = req.body;
        const topicNum = parseInt(restartTopicNumber || restartTopic, 10) || 1;
        const alertRes = await index_js_1.db.query('SELECT * FROM student_failed_alerts WHERE id = $1', [id]);
        if (alertRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Xabarnoma topilmadi" });
        }
        const alert = alertRes.rows[0];
        // O'quvchining dars progressini yangilash
        await index_js_1.db.query(`UPDATE user_study_progress 
       SET current_topic_index = $1, study_step_state = 'learning', step_state = 'learning', review_fail_count = 0, updated_at = CURRENT_TIMESTAMP
       WHERE telegram_id = $2`, [topicNum, alert.telegram_id]);
        // Alertni hal qilingan va o'qilgan deb belgilash
        await index_js_1.db.query(`UPDATE student_failed_alerts 
       SET status = 'resolved', is_read = TRUE, admin_assigned_topic = $1, resolved_at = CURRENT_TIMESTAMP
       WHERE id = $2`, [topicNum, id]);
        res.json({
            success: true,
            message: `✅ O'quvchi uchun darslar ${topicNum}-mavzudan qayta boshlanishi belgilandi!`
        });
    }
    catch (err) {
        console.error('Restart topic error:', err);
        res.status(500).json({ success: false, message: "Mavzuni belgilashda xatolik" });
    }
});
// ==========================================
// 7. KITOBLAR VA DARSLIKLAR KUTUBXONASI (Band 2: Alohida Kitoblar bo'limi)
// ==========================================
exports.apiRouter.get('/books', async (req, res) => {
    try {
        const booksRes = await index_js_1.db.query('SELECT * FROM books ORDER BY id DESC');
        const groupsRes = await index_js_1.db.query('SELECT id, name, book_name, book_pdf_path FROM groups');
        const books = booksRes.rows.map((b) => {
            let parsedTopics = [];
            try {
                parsedTopics = typeof b.topics === 'string' ? JSON.parse(b.topics) : (b.topics || []);
            }
            catch { }
            const attachedGroups = groupsRes.rows
                .filter((g) => g.book_name === b.title || g.book_pdf_path === b.pdf_path)
                .map((g) => ({ id: g.id, name: g.name }));
            return {
                ...b,
                topics: parsedTopics,
                topics_count: parsedTopics.length || b.topics_count || 0,
                attachedGroups,
            };
        });
        res.json({ success: true, data: books });
    }
    catch (err) {
        console.error('Get books error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// Yangi kitob yuklash
exports.apiRouter.post('/books', upload.any(), async (req, res) => {
    try {
        const files = req.files || [];
        const file = files[0] || req.file;
        if (!file) {
            return res.status(400).json({ success: false, message: "PDF fayli tanlanmadi!" });
        }
        const filePath = file.path;
        const relPath = '/uploads/books/' + path_1.default.basename(filePath);
        const bookTitle = (req.body.title || file.originalname.replace(/\.pdf$/i, '')).trim();
        const stats = fs_1.default.statSync(filePath);
        // PDF matnini ajratish va mavzular tuzish
        const text = await pdfBook_js_1.PdfBookService.extractTextFromPdf(filePath);
        const topics = await pdfBook_js_1.PdfBookService.generateTopicsFromBook(bookTitle, text);
        const insertRes = await index_js_1.db.query(`INSERT INTO books (title, pdf_path, file_size, text_content, topics, topics_count)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [bookTitle, relPath, stats.size || 0, text, JSON.stringify(topics), topics.length]);
        res.json({
            success: true,
            message: `✅ "${bookTitle}" kitobi kutubxonaga yuklandi (${topics.length} ta mavzu)!`,
            data: {
                ...insertRes.rows[0],
                topics,
                topics_count: topics.length,
            },
        });
    }
    catch (err) {
        console.error('Upload book to library error:', err);
        res.status(500).json({ success: false, message: "Kitobni yuklashda xatolik: " + err.message });
    }
});
// Kitobni o'chirish (kutubxonadan va biriktirilgan guruhlardan toza uzish)
exports.apiRouter.delete('/books/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const bookRes = await index_js_1.db.query('SELECT * FROM books WHERE id = $1', [id]);
        if (bookRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Kitob topilmadi" });
        }
        const book = bookRes.rows[0];
        // Biriktirilgan guruhlardan uzish
        await index_js_1.db.query(`UPDATE groups 
       SET book_id = NULL, book_name = NULL, book_pdf_path = NULL, book_text = NULL, book_topics = NULL 
       WHERE book_name = $1 OR book_pdf_path = $2`, [book.title, book.pdf_path]);
        // Test settings dan ham uzish agar u yerda biriktirilgan bo'lsa
        await index_js_1.db.query(`UPDATE test_settings 
       SET test_book_name = NULL, test_book_pdf_path = NULL, test_book_text = NULL 
       WHERE test_book_name = $1 OR test_book_pdf_path = $2`, [book.title, book.pdf_path]);
        // Faylni o'chirish
        try {
            const fullPath = path_1.default.join(process.cwd(), book.pdf_path.replace(/^\//, ''));
            if (fs_1.default.existsSync(fullPath)) {
                fs_1.default.unlinkSync(fullPath);
            }
        }
        catch { }
        await index_js_1.db.query('DELETE FROM books WHERE id = $1', [id]);
        res.json({ success: true, message: `"${book.title}" kitobi muvaffaqiyatli o'chirildi!` });
    }
    catch (err) {
        console.error('Delete book error:', err);
        res.status(500).json({ success: false, message: "Kitobni o'chirishda xatolik: " + err.message });
    }
});
// Kitobni guruhga biriktirish (Faqat shu guruhga izolatsiyalangan holda!)
exports.apiRouter.post('/groups/:id/attach-book', async (req, res) => {
    try {
        const groupId = parseInt(req.params.id, 10);
        const { bookId } = req.body;
        const grpRes = await index_js_1.db.query('SELECT * FROM groups WHERE id = $1', [groupId]);
        if (grpRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Guruh topilmadi" });
        }
        const bookRes = await index_js_1.db.query('SELECT * FROM books WHERE id = $1', [bookId]);
        if (bookRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Kitob topilmadi" });
        }
        const book = bookRes.rows[0];
        // FAQAT ushbu guruhga biriktirish (boshqa guruhlarga aslo tegmasdan!)
        await index_js_1.db.query(`UPDATE groups 
       SET book_id = $1, book_name = $2, book_pdf_path = $3, book_text = $4, book_topics = $5
       WHERE id = $6`, [book.id, book.title, book.pdf_path, book.text_content, book.topics, groupId]);
        res.json({
            success: true,
            message: `✅ "${book.title}" kitobi faqat "${grpRes.rows[0].name}" guruhiga muvaffaqiyatli biriktirildi!`,
            group_id: groupId,
            book_title: book.title,
        });
    }
    catch (err) {
        console.error('Attach book to group error:', err);
        res.status(500).json({ success: false, message: "Kitobni biriktirishda xatolik" });
    }
});
// Guruhdan kitobni uzish
exports.apiRouter.post('/groups/:id/detach-book', async (req, res) => {
    try {
        const groupId = parseInt(req.params.id, 10);
        await index_js_1.db.query(`UPDATE groups 
       SET book_id = NULL, book_name = NULL, book_pdf_path = NULL, book_text = NULL, book_topics = NULL 
       WHERE id = $1`, [groupId]);
        res.json({ success: true, message: "Kitob guruhdan muvaffaqiyatli uzildi" });
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Kitobni uzishda xatolik" });
    }
});
