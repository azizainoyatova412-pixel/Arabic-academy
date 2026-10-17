"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitAcademyReview = submitAcademyReview;
exports.getAcademyStudentStats = getAcademyStudentStats;
exports.syncAcademyStats = syncAcademyStats;
const index_js_1 = require("../db/index.js");
const config_js_1 = require("../config.js");
async function sendAcademyRequest(path, payload) {
    if (!config_js_1.config.academyApiUrl || !config_js_1.config.academySyncSecret) {
        throw new Error('ACADEMY_API_URL yoki ACADEMY_SYNC_SECRET sozlanmagan');
    }
    const response = await fetch(`${config_js_1.config.academyApiUrl}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-bot-sync-secret': config_js_1.config.academySyncSecret,
        },
        body: JSON.stringify(payload),
    });
    const responseText = await response.text();
    const contentType = response.headers.get('content-type') || '';
    let data;
    if (!contentType.includes('application/json')) {
        if (response.status === 404 && responseText.includes('Cannot POST')) {
            throw new Error(`${path} endpointi saytda topilmadi. Sayt backend o‘zgarishlarini deploy qiling.`);
        }
        throw new Error(`Sayt API JSON emas javob qaytardi (HTTP ${response.status}, ${contentType || 'content-type yo‘q'}). ACADEMY_API_URL manzilini tekshiring.`);
    }
    try {
        data = JSON.parse(responseText);
    }
    catch {
        throw new Error(`Sayt API noto‘g‘ri JSON qaytardi (HTTP ${response.status}).`);
    }
    if (!response.ok)
        throw new Error(data.error || `Akademiya API xatosi: ${response.status}`);
    return data;
}
async function submitAcademyReview(telegramId, name, text) {
    await sendAcademyRequest('/api/bot/reviews', { telegram_id: telegramId, name, text });
}
async function getAcademyStudentStats(telegramId) {
    return await sendAcademyRequest('/api/bot/student-stats', { telegram_id: telegramId });
}
async function syncAcademyStats() {
    const [users, groups, tests, gradedStudents] = await Promise.all([
        index_js_1.db.query("SELECT COUNT(*) AS count FROM users WHERE status = 'active'"),
        index_js_1.db.query('SELECT COUNT(*) AS count FROM groups WHERE is_active = TRUE'),
        index_js_1.db.query('SELECT COUNT(*) AS count FROM user_tests'),
        index_js_1.db.query('SELECT COUNT(*) AS count FROM users WHERE grade IS NOT NULL AND grade > 0'),
    ]);
    const count = (rows) => Number(rows[0]?.count || 0);
    await sendAcademyRequest('/api/bot/stats', {
        users: count(users.rows),
        groups: count(groups.rows),
        tests: count(tests.rows),
        gradedStudents: count(gradedStudents.rows),
    });
}
