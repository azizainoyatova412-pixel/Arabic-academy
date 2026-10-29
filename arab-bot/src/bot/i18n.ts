import { db } from '../db/index.js';

export class I18nService {
  /**
   * Foydalanuvchi tilini bazadan olish
   */
  public static async getUserLanguage(telegramId: number | string): Promise<string> {
    try {
      const res = await db.query('SELECT language_code FROM users WHERE telegram_id = $1', [Number(telegramId)]);
      return res.rows[0]?.language_code || 'uz';
    } catch {
      return 'uz';
    }
  }

  /**
   * Foydalanuvchi tilini o'rnatish
   */
  public static async setUserLanguage(telegramId: number | string, langCode: string): Promise<void> {
    try {
      await db.query('UPDATE users SET language_code = $1 WHERE telegram_id = $2', [langCode, Number(telegramId)]);
    } catch (err) {
      console.error('[I18n] Error setting user language:', err);
    }
  }

  /**
   * Tizim matnini foydalanuvchi tilida olish
   */
  public static async getText(key: string, lang: string = 'uz', defaultText: string = ''): Promise<string> {
    try {
      const res = await db.query('SELECT * FROM system_translations WHERE key = $1', [key]);
      if (res.rows.length === 0) return defaultText;

      const row = res.rows[0];
      if (lang === 'uz' && row.text_uz) return row.text_uz;
      if (lang === 'ru' && row.text_ru) return row.text_ru;
      if (lang === 'en' && row.text_en) return row.text_en;

      // Agar boshqa maxsus til bo'lsa, translations JSON dan qidiramiz
      if (row.translations) {
        try {
          const transObj = typeof row.translations === 'string' ? JSON.parse(row.translations) : row.translations;
          if (transObj[lang]) return transObj[lang];
        } catch {}
      }

      return row.text_uz || row.text_en || defaultText;
    } catch {
      return defaultText;
    }
  }

  /**
   * Barcha faol tillarni olish
   */
  public static async getActiveLanguages(): Promise<Array<{ code: string; name: string; flag: string }>> {
    try {
      const res = await db.query('SELECT code, name, flag FROM languages WHERE is_active = TRUE ORDER BY code');
      return res.rows;
    } catch {
      return [
        { code: 'uz', name: "O'zbek", flag: '🇺🇿' },
        { code: 'ru', name: 'Русский', flag: '🇷🇺' },
        { code: 'en', name: 'English', flag: '🇬🇧' },
      ];
    }
  }
}
