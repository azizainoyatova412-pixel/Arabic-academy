"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.I18nService = void 0;
const index_js_1 = require("../db/index.js");
class I18nService {
    /**
     * Foydalanuvchi tilini bazadan olish
     */
    static async getUserLanguage(telegramId) {
        try {
            const res = await index_js_1.db.query('SELECT language_code FROM users WHERE telegram_id = $1', [Number(telegramId)]);
            return res.rows[0]?.language_code || 'uz';
        }
        catch {
            return 'uz';
        }
    }
    /**
     * Foydalanuvchi tilini o'rnatish
     */
    static async setUserLanguage(telegramId, langCode) {
        try {
            await index_js_1.db.query('UPDATE users SET language_code = $1 WHERE telegram_id = $2', [langCode, Number(telegramId)]);
        }
        catch (err) {
            console.error('[I18n] Error setting user language:', err);
        }
    }
    /**
     * Tizim matnini foydalanuvchi tilida olish
     */
    static async getText(key, lang = 'uz', defaultText = '') {
        try {
            const res = await index_js_1.db.query('SELECT * FROM system_translations WHERE key = $1', [key]);
            if (res.rows.length === 0)
                return defaultText;
            const row = res.rows[0];
            if (lang === 'uz' && row.text_uz)
                return row.text_uz;
            if (lang === 'ru' && row.text_ru)
                return row.text_ru;
            if (lang === 'en' && row.text_en)
                return row.text_en;
            // Agar boshqa maxsus til bo'lsa, translations JSON dan qidiramiz
            if (row.translations) {
                try {
                    const transObj = typeof row.translations === 'string' ? JSON.parse(row.translations) : row.translations;
                    if (transObj[lang])
                        return transObj[lang];
                }
                catch { }
            }
            return row.text_uz || row.text_en || defaultText;
        }
        catch {
            return defaultText;
        }
    }
    /**
     * Barcha faol tillarni olish
     */
    static async getActiveLanguages() {
        try {
            const res = await index_js_1.db.query('SELECT code, name, flag FROM languages WHERE is_active = TRUE ORDER BY code');
            return res.rows;
        }
        catch {
            return [
                { code: 'uz', name: "O'zbek", flag: '🇺🇿' },
                { code: 'ru', name: 'Русский', flag: '🇷🇺' },
                { code: 'en', name: 'English', flag: '🇬🇧' },
            ];
        }
    }
}
exports.I18nService = I18nService;
