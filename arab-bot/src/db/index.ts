import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';

export type DbEngine = 'postgres' | 'sqlite';

/**
 * Asia/Tashkent vaqt mintaqasi bo'yicha joriy sanani (YYYY-MM-DD) qaytaradi.
 */
export function getTashkentDate(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date());
}

class DatabaseManager {
  private pgPool: Pool | null = null;
  private sqliteDb: DatabaseSync | null = null;
  private engine: DbEngine = 'sqlite';
  private isInitialized = false;

  public getEngine(): DbEngine {
    return this.engine;
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    // 1. Birinchi navbatda PostgreSQL ga ulanishga urinib ko'ramiz
    if (config.databaseUrl) {
      try {
        console.log('[DB] PostgreSQL bazasiga ulanish tekshirilmoqda...');
        if (config.databaseSchema && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(config.databaseSchema)) {
          throw new Error('BOT_DATABASE_SCHEMA faqat harf, raqam va pastki chiziqdan iborat bo‘lishi kerak');
        }
        let rawUrl = (config.databaseUrl || '').trim();
        rawUrl = rawUrl.replace(/&?channel_binding=[^&]*/g, '');
        const isCloudDb = rawUrl.includes('neon.tech') || rawUrl.includes('sslmode=require');
        const pool = new Pool({
          connectionString: rawUrl,
          ssl: isCloudDb ? { rejectUnauthorized: false } : false,
          options: config.databaseSchema ? `-c search_path=${config.databaseSchema}` : undefined,
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 10000,
          keepAlive: true,
        });

        // Test so'rov
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();

        if (config.databaseSchema) {
          await pool.query(`CREATE SCHEMA IF NOT EXISTS "${config.databaseSchema}"`);
          console.log(`[DB] Bot jadvallari uchun "${config.databaseSchema}" schema ishlatiladi.`);
        }

        this.pgPool = pool;
        this.engine = 'postgres';
        console.log('✅ [DB] PostgreSQL bazasiga muvaffaqiyatli ulandi!');
      } catch (err: any) {
        console.warn('⚠️ [DB] PostgreSQL ulanmadi (' + (err?.message || 'aloqa yo\'q') + ').');
        console.log('🔄 [DB] Zaxira sifatida avtomatik ravishda lokal SQLite bazasiga o\'tilmoqda...');
        this.pgPool = null;
      }
    }

    // 2. Agar PostgreSQL ishlamasa yoki bo'lmasa, Node.js native SQLite bazasini yoqamiz
    if (!this.pgPool) {
      const dataDir = path.resolve(__dirname, '..', '..', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const dbPath = path.join(dataDir, 'arab_bot.db');
      this.sqliteDb = new DatabaseSync(dbPath);
      this.engine = 'sqlite';
      console.log(`✅ [DB] SQLite bazasi faol: ${dbPath}`);
    }

    // 3. Jadvallarni yaratamiz va dastlabki ma'lumotlarni to'ldiramiz
    this.isInitialized = true;
    await this.setupSchema();
    await this.seedInitialData();
  }

  /**
   * Umumiy so'rov metodi: PostgreSQL va SQLite uchun yagona interfeys
   */
  public async query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
    if (!this.isInitialized) {
      await this.init();
    }

    if (this.engine === 'postgres' && this.pgPool) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // Postgres uchun $1, $2 parametri ishlatiladi
          const res = await this.pgPool.query(sql, params);
          return { rows: res.rows as T[], rowCount: res.rowCount || 0 };
        } catch (err: any) {
          const isTransient = /ECONNRESET|Connection terminated|closed|timeout|socket/i.test(err?.message || '');
          if (isTransient && attempt < 3) {
            await new Promise((r) => setTimeout(r, 200 * attempt));
            continue;
          }
          console.error('[DB Postgres Query Error]:', err, sql, params);
          throw err;
        }
      }
    } else if (this.sqliteDb) {
      try {
        // Postgres SQL ($1, $2) ni SQLite (?) ga moslashtiramiz
        let sqliteSql = sql.replace(/\$(\d+)/g, '?');

        // PostgreSQL SERIAL yoki RETURNING sintaksisini SQLite ga moslashtirish
        sqliteSql = sqliteSql.replace(/RETURNING\s+id/gi, '');

        // SELECT yoki boshqa so'rovlarni ajratamiz
        const trimmed = sqliteSql.trim();
        const isSelect = /^SELECT\b/i.test(trimmed);

        const stmt = this.sqliteDb.prepare(sqliteSql);
        const mappedParams = params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p));

        if (isSelect) {
          const rows = stmt.all(...mappedParams) as T[];
          return { rows, rowCount: rows.length };
        } else {
          const result = stmt.run(...mappedParams);
          // Agar INSERT bo'lsa va RETURNING id talab qilingan bo'lsa:
          const lastInsertId = result.lastInsertRowid;
          return {
            rows: (lastInsertId ? [{ id: Number(lastInsertId) }] : []) as T[],
            rowCount: Number(result.changes) || 0,
          };
        }
      } catch (err) {
        console.error('[DB SQLite Query Error]:', err, sql, params);
        throw err;
      }
    }

    throw new Error('Database is not initialized');
  }

  public async execute(sql: string, params: any[] = []): Promise<void> {
    await this.query(sql, params);
  }

  /**
   * Tranzaksiya bajarish (atomik yaxlitlik uchun)
   */
  public async transaction<T>(callback: (trx: DatabaseManager) => Promise<T>): Promise<T> {
    if (this.engine === 'postgres' && this.pgPool) {
      const client: PoolClient = await this.pgPool.connect();
      try {
        await client.query('BEGIN');
        const trxManager = Object.create(this);
        trxManager.query = async (sql: string, params: any[] = []) => {
          const res = await client.query(sql, params);
          return { rows: res.rows, rowCount: res.rowCount || 0 };
        };
        const result = await callback(trxManager);
        await client.query('COMMIT');
        return result;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } else {
      // SQLite tranzaksiyasi
      try {
        this.sqliteDb?.exec('BEGIN TRANSACTION;');
        const result = await callback(this);
        this.sqliteDb?.exec('COMMIT;');
        return result;
      } catch (e) {
        this.sqliteDb?.exec('ROLLBACK;');
        throw e;
      }
    }
  }

  private async setupSchema(): Promise<void> {
    const isPg = this.engine === 'postgres';
    const idType = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    const jsonType = isPg ? 'JSONB' : 'TEXT';

    const statements = [
      `CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

      `CREATE TABLE IF NOT EXISTS languages (
        code VARCHAR(10) PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        flag VARCHAR(10) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        is_translating BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

      `CREATE TABLE IF NOT EXISTS menu_buttons (
        id ${idType},
        key VARCHAR(50) UNIQUE NOT NULL,
        title_uz VARCHAR(100) NOT NULL,
        title_ru VARCHAR(100) NOT NULL,
        title_en VARCHAR(100) NOT NULL,
        icon VARCHAR(10) DEFAULT '',
        action VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        translations ${jsonType}
      );`,

      `CREATE TABLE IF NOT EXISTS courses (
        id ${idType},
        title_uz VARCHAR(200) NOT NULL,
        title_ru VARCHAR(200) NOT NULL,
        title_en VARCHAR(200) NOT NULL,
        description_uz TEXT,
        description_ru TEXT,
        description_en TEXT,
        price VARCHAR(100) NOT NULL,
        duration VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

      `CREATE TABLE IF NOT EXISTS groups (
        id ${idType},
        name VARCHAR(150) NOT NULL,
        telegram_chat_id VARCHAR(100),
        telegram_invite_link TEXT,
        access_code VARCHAR(50) NOT NULL,
        description TEXT,
        course_id INTEGER,
        book_name TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

      `CREATE TABLE IF NOT EXISTS video_lessons (
        id ${idType},
        group_id INTEGER NOT NULL,
        title VARCHAR(200) NOT NULL,
        video_url TEXT NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
      );`,

      `CREATE TABLE IF NOT EXISTS users (
        id ${idType},
        telegram_id BIGINT UNIQUE NOT NULL,
        username VARCHAR(100),
        first_name VARCHAR(150),
        language_code VARCHAR(10) DEFAULT 'uz',
        joined_group_id INTEGER,
        grade INTEGER,
        is_paid BOOLEAN DEFAULT FALSE,
        is_teacher BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'active',
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (joined_group_id) REFERENCES groups(id) ON DELETE SET NULL
      );`,

      `CREATE TABLE IF NOT EXISTS payment_requests (
        id ${idType},
        user_id INTEGER,
        telegram_id BIGINT NOT NULL,
        user_name VARCHAR(150),
        group_id INTEGER,
        deadline_date VARCHAR(50),
        status VARCHAR(20) DEFAULT 'pending',
        note TEXT,
        admin_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
      );`,

      `CREATE TABLE IF NOT EXISTS user_tests (
        id ${idType},
        user_id INTEGER,
        telegram_id BIGINT NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        percentage INTEGER NOT NULL,
        level VARCHAR(50) NOT NULL,
        recommended_course TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`,

      `CREATE TABLE IF NOT EXISTS lesson_views (
        id ${idType},
        user_id INTEGER NOT NULL,
        lesson_id INTEGER NOT NULL,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES video_lessons(id) ON DELETE CASCADE
      );`,

      `CREATE TABLE IF NOT EXISTS student_grades (
        id ${idType},
        user_id INTEGER NOT NULL,
        grade INTEGER NOT NULL,
        grade_date VARCHAR(10) NOT NULL,
        lesson_title VARCHAR(200),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`,

      `CREATE TABLE IF NOT EXISTS system_translations (
        id ${idType},
        key VARCHAR(100) UNIQUE NOT NULL,
        text_uz TEXT NOT NULL,
        text_ru TEXT NOT NULL,
        text_en TEXT NOT NULL,
        translations ${jsonType}
      );`,

      `CREATE TABLE IF NOT EXISTS daily_test_attempts (
        id ${idType},
        telegram_id BIGINT NOT NULL,
        test_date VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(telegram_id, test_date)
      );`,

      `CREATE TABLE IF NOT EXISTS user_topic_stats (
        id ${idType},
        telegram_id BIGINT NOT NULL,
        topic VARCHAR(100) NOT NULL,
        correct_count INTEGER DEFAULT 0,
        wrong_count INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(telegram_id, topic)
      );`,

      `CREATE TABLE IF NOT EXISTS academy_group_topic_stats (
        id ${idType},
        telegram_id BIGINT NOT NULL,
        academy_group_id INTEGER NOT NULL,
        topic VARCHAR(100) NOT NULL,
        correct_count INTEGER DEFAULT 0,
        wrong_count INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(telegram_id, academy_group_id, topic)
      );`,

      `CREATE TABLE IF NOT EXISTS user_quiz_history (
        id ${idType},
        telegram_id BIGINT NOT NULL,
        question TEXT NOT NULL,
        topic VARCHAR(100),
        is_correct BOOLEAN NOT NULL,
        user_answer TEXT,
        correct_answer TEXT,
        explanation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

      `CREATE TABLE IF NOT EXISTS user_study_progress (
        id ${idType},
        user_id INTEGER,
        telegram_id BIGINT NOT NULL,
        group_id INTEGER,
        current_topic_index INTEGER DEFAULT 1,
        last_topic_passed INTEGER DEFAULT 0,
        step_state VARCHAR(50) DEFAULT 'learning',
        current_question_text TEXT,
        current_question_answer TEXT,
        current_question_type VARCHAR(50),
        review_topic_index INTEGER,
        review_fail_count INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(telegram_id, group_id)
      );`,

      `CREATE TABLE IF NOT EXISTS student_failed_alerts (
        id ${idType},
        student_id INTEGER,
        telegram_id BIGINT NOT NULL,
        student_name VARCHAR(150),
        user_name VARCHAR(150),
        group_id INTEGER,
        group_name VARCHAR(150),
        failed_topic_number INTEGER,
        failed_topic_title VARCHAR(255),
        question_text TEXT,
        student_answer TEXT,
        user_answer TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        admin_assigned_topic INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      );`,

      `CREATE TABLE IF NOT EXISTS books (
        id ${idType},
        title VARCHAR(255) NOT NULL,
        pdf_path TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        text_content TEXT,
        topics TEXT,
        topics_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

      `CREATE TABLE IF NOT EXISTS test_settings (
        id ${idType},
        test_book_name TEXT,
        test_book_pdf_path TEXT,
        test_book_text TEXT,
        test_topics_selection TEXT DEFAULT 'all',
        test_question_types TEXT DEFAULT '["auto"]',
        test_questions_count INTEGER DEFAULT 5,
        test_daily_limit INTEGER DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
    ];

    for (const sql of statements) {
      if (this.engine === 'postgres' && this.pgPool) {
        await this.pgPool.query(sql);
      } else if (this.sqliteDb) {
        this.sqliteDb.exec(sql);
      }
    }

    // Mavjud bazalar uchun yangi ustunlarni xavfsiz qo'shish (Auto-migration)
    const alterColumns = [
      'ALTER TABLE users ADD COLUMN grade INTEGER',
      'ALTER TABLE users ADD COLUMN is_paid BOOLEAN DEFAULT FALSE',
      'ALTER TABLE users ADD COLUMN is_teacher BOOLEAN DEFAULT FALSE',
      'ALTER TABLE users ADD COLUMN academy_group_id INTEGER',
      'ALTER TABLE users ADD COLUMN academy_group_name VARCHAR(150)',
      'ALTER TABLE user_tests ADD COLUMN academy_group_id INTEGER',
      'ALTER TABLE user_quiz_history ADD COLUMN academy_group_id INTEGER',
      'ALTER TABLE daily_test_attempts ADD COLUMN academy_group_id INTEGER',
      'ALTER TABLE user_tests ADD COLUMN test_type VARCHAR(20) DEFAULT \'practice\'',
      'ALTER TABLE user_tests ADD COLUMN test_date VARCHAR(10)',
      'ALTER TABLE groups ADD COLUMN book_id INTEGER',
      'ALTER TABLE groups ADD COLUMN book_name TEXT',
      'ALTER TABLE groups ADD COLUMN book_pdf_path TEXT',
      'ALTER TABLE groups ADD COLUMN book_text TEXT',
      'ALTER TABLE groups ADD COLUMN book_topics TEXT',
      'ALTER TABLE user_study_progress ADD COLUMN study_step_state VARCHAR(50) DEFAULT \'learning\'',
      'ALTER TABLE user_study_progress ADD COLUMN active_question TEXT',
      'ALTER TABLE user_study_progress ADD COLUMN active_question_type VARCHAR(50)',
      'ALTER TABLE user_study_progress ADD COLUMN review_fail_count INTEGER DEFAULT 0',
      'ALTER TABLE test_settings ADD COLUMN test_book_name TEXT',
      'ALTER TABLE test_settings ADD COLUMN test_book_pdf_path TEXT',
      'ALTER TABLE test_settings ADD COLUMN test_book_text TEXT',
      'ALTER TABLE test_settings ADD COLUMN test_topics_selection TEXT DEFAULT \'all\'',
      'ALTER TABLE test_settings ADD COLUMN test_question_types TEXT DEFAULT \'["auto"]\'',
      'ALTER TABLE test_settings ADD COLUMN test_questions_count INTEGER DEFAULT 5',
      'ALTER TABLE test_settings ADD COLUMN test_daily_limit INTEGER DEFAULT 1',
      'ALTER TABLE daily_test_attempts ADD COLUMN score INTEGER DEFAULT 0',
      'ALTER TABLE daily_test_attempts ADD COLUMN total INTEGER DEFAULT 5',
      'ALTER TABLE student_failed_alerts ADD COLUMN student_id INTEGER',
      'ALTER TABLE student_failed_alerts ADD COLUMN student_name VARCHAR(150)',
      'ALTER TABLE student_failed_alerts ADD COLUMN student_answer TEXT',
      'ALTER TABLE student_failed_alerts ADD COLUMN is_read BOOLEAN DEFAULT FALSE',
    ];
    for (const alterSql of alterColumns) {
      try {
        if (this.engine === 'postgres' && this.pgPool) {
          await this.pgPool.query(alterSql);
        } else if (this.sqliteDb) {
          this.sqliteDb.exec(alterSql);
        }
      } catch {
        // Agar ustun allaqachon mavjud bo'lsa xatoni e'tiborsiz qoldiramiz
      }
    }

    // Soxta/test ma'lumotlarni tozalash (Band 1 talabi: soxta ma'lumotlar bo'lmasin)
    try {
      await this.query(
        "DELETE FROM student_failed_alerts WHERE student_name LIKE '%Test%' OR telegram_id = 999888777"
      );
    } catch {}

    try {
      const tsCheck = await this.query('SELECT id FROM test_settings LIMIT 1');
      if (tsCheck.rows.length === 0) {
        await this.query(
          `INSERT INTO test_settings (test_book_name, test_topics_selection, test_question_types, test_questions_count, test_daily_limit)
           VALUES ('Arab tili asoslari', 'all', '["auto"]', 5, 1)`
        );
      }
    } catch {}


    // Mavjud o'quvchilar baholarini student_grades ga xavfsiz o'tkazish
    try {
      const gradesCount = await this.query('SELECT COUNT(*) as count FROM student_grades');
      if (Number(gradesCount.rows[0]?.count || 0) === 0) {
        const usersWithGrades = await this.query('SELECT id, grade FROM users WHERE grade IS NOT NULL AND grade > 0');
        const today = getTashkentDate();
        for (const u of usersWithGrades.rows) {
          await this.query(
            'INSERT INTO student_grades (user_id, grade, grade_date, lesson_title) VALUES ($1, $2, $3, $4)',
            [u.id, u.grade, today, 'Boshlang\'ich baho']
          );
        }
      }
    } catch (e) {
      console.warn('[DB Migration Warning]:', e);
    }

    console.log('✅ [DB] Jadvallar va schema muvaffaqiyatli tayyorlandi.');
  }

  private async seedInitialData(): Promise<void> {
    // 1. Dastlabki tillar
    const langCount = await this.query('SELECT COUNT(*) as count FROM languages');
    const totalLangs = Number(langCount.rows[0]?.count || 0);

    if (totalLangs === 0) {
      console.log('🌱 [DB] Dastlabki tillar kiritilmoqda...');
      const langs = [
        ['uz', "O'zbek", '🇺🇿', 1, 0],
        ['ru', 'Русский', '🇷🇺', 1, 0],
        ['en', 'English', '🇬🇧', 1, 0],
      ];
      for (const [code, name, flag, isActive, isTranslating] of langs) {
        await this.query(
          'INSERT INTO languages (code, name, flag, is_active, is_translating) VALUES ($1, $2, $3, $4, $5)',
          [code, name, flag, Boolean(isActive), Boolean(isTranslating)]
        );
      }
    }

    // 2. Dastlabki menyu tugmalari
    const menuCount = await this.query('SELECT COUNT(*) as count FROM menu_buttons');
    if (Number(menuCount.rows[0]?.count || 0) === 0) {
      console.log('🌱 [DB] Asosiy menyu tugmalari kiritilmoqda...');
      const buttons = [
        ['stats', '📊 Statistika', '📊 Статистика', '📊 Statistics', '📊', 'stats', 1, 1],
        ['groups', '👥 Guruhlar', '👥 Группы', '👥 Groups', '👥', 'groups', 1, 2],
        ['test', '📝 Test', '📝 Тест', '📝 Test', '📝', 'test', 1, 3],
        ['payment', "💳 To'lov", '💳 Оплата', '💳 Payment', '💳', 'payment', 1, 4],
      ];
      for (const [key, uz, ru, en, icon, action, active, sort] of buttons) {
        await this.query(
          'INSERT INTO menu_buttons (key, title_uz, title_ru, title_en, icon, action, is_active, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [key, uz, ru, en, icon, action, Boolean(active), sort]
        );
      }
    }

    // 3. Dastlabki kurslar (Requirement 9: Aniq matnlar)
    const coursesData = [
      [
        "A1 Darajasi",
        "A1 Уровень",
        "A1 Level",
        "Alifbo, to'g'ri tovushlar va maxrajlar, o'qish-yozish qoidalari hamda boshlang'ich asosiy so'z boyligi. Dastlabki bir oyda 150+ so'z yodlaysiz, grammatik qoidalar bilan.",
        "Алфавит, правильные звуки и махрадж, правила чтения и письма, а также базовый словарный запас. В первый месяц учите 150+ слов с основами грамматики.",
        "Alphabet, accurate sounds and articulation, reading/writing rules, and core basic vocabulary. Learn 150+ words in the first month with grammar basics.",
        "250 000 so'm / oy",
        "2 oy",
        1,
        1
      ],
      [
        "A2 Darajasi",
        "A2 Уровень",
        "A2 Level",
        "Sodda gap tuzilmalari, kundalik muloqot, asosiy grammatika va mustaqil matnlarni tushunish ko'nikmalari.",
        "Простые структуры предложений, ежедневное общение, базовая грамматика и навыки понимания самостоятельных текстов.",
        "Simple sentence structures, daily conversation, fundamental grammar, and independent reading comprehension.",
        "300 000 so'm / oy",
        "2 oy",
        1,
        2
      ],
      [
        "B1 – B2 Darajasi",
        "B1 – B2 Уровень",
        "B1 – B2 Level",
        "Sarf, nahv, ravon nutq, akademik matnlar va amaliy suhbat ko'nikmalari bilan ishlanadi.",
        "Сарф, нахв, беглая речь, академические тексты и навыки практического диалога.",
        "Sarf, nahw, fluent speech, academic texts, and practical conversation skills.",
        "350 000 so'm / oy",
        "3 oy",
        1,
        3
      ]
    ];

    const courseCount = await this.query('SELECT COUNT(*) as count FROM courses');
    if (Number(courseCount.rows[0]?.count || 0) === 0) {
      console.log('🌱 [DB] Dastlabki kurslar kiritilmoqda...');
      for (const [tUz, tRu, tEn, dUz, dRu, dEn, price, duration, active, sort] of coursesData) {
        await this.query(
          'INSERT INTO courses (title_uz, title_ru, title_en, description_uz, description_ru, description_en, price, duration, is_active, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [tUz, tRu, tEn, dUz, dRu, dEn, price, duration, Boolean(active), sort]
        );
      }
    } else {
      // Mavjud kurslar matnini Requirement 9 bo'yicha yangilaymiz
      for (let i = 0; i < coursesData.length; i++) {
        const [tUz, tRu, tEn, dUz, dRu, dEn] = coursesData[i];
        await this.query(
          'UPDATE courses SET title_uz = $1, title_ru = $2, title_en = $3, description_uz = $4, description_ru = $5, description_en = $6 WHERE sort_order = $7',
          [tUz, tRu, tEn, dUz, dRu, dEn, i + 1]
        );
      }
    }

    // 4. Dastlabki namunaviy guruh va darslar
    const groupCount = await this.query('SELECT COUNT(*) as count FROM groups');
    if (Number(groupCount.rows[0]?.count || 0) === 0) {
      console.log('🌱 [DB] Dastlabki guruhlar kiritilmoqda...');
      await this.query(
        `INSERT INTO groups (name, telegram_chat_id, telegram_invite_link, access_code, description, course_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          "Boshlang'ich A-1 Guruh",
          "-1001234567890",
          "https://t.me/+ArabTiliBoshlangichDemo",
          "ARAB2026",
          "Alifbo va to'g'ri talaffuz guruhi",
          1,
          1
        ]
      );

      // Guruh uchun namunaviy video darslar
      const grp = await this.query('SELECT id FROM groups LIMIT 1');
      if (grp.rows[0]?.id) {
        const grpId = grp.rows[0].id;
        await this.query(
          `INSERT INTO video_lessons (group_id, title, video_url, description, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [grpId, "1-dars: Arab alifbosi bilan tanishuv (Alif, Ba, Ta, Sa)", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "Dastlabki 4 harf maxraji va yozilishi", 1]
        );
        await this.query(
          `INSERT INTO video_lessons (group_id, title, video_url, description, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [grpId, "2-dars: Jim, Ha, Xo harflari va harakatlar (Fatha, Kasra, Zamma)", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "Harakatlar bilan o'qish qoidalari", 2]
        );
      }
    }

    // 5. Standart tizim matnlari (Tillar bo'yicha)
    const texts = [
      {
        key: 'welcome',
        uz: "Assalomu alaykum va rahmatulloh! Arab tili o'quv botiga xush kelibsiz! 🌟\n\nBu yerda siz noldan professional darajagacha arab tilini o'rganishingiz, maxsus guruhlarga a'zo bo'lishingiz va video darslarni tomosha qilishingiz mumkin.",
        ru: "Здравствуйте! Добро пожаловать в бот изучения арабского языка! 🌟\n\nЗдесь вы сможете изучить арабский язык с нуля до профессионального уровня, вступить в специальные группы и смотреть видеоуроки.",
        en: "Welcome to the Arabic Learning Bot! 🌟\n\nHere you can learn Arabic from scratch to an advanced level, join dedicated study groups, and watch video lessons."
      },
      {
        key: 'course_info_prompt',
        uz: "📚 **Bizning kurslarimiz:**\n\n1️⃣ **Boshlang'ich Arab tili** (Alifbo, fonetika, o'qish)\n2️⃣ **Sarf va Nahv** (Grammatika va Qur'on matnlari)\n3️⃣ **Fusha So'zlashuv** (Ravon muloqot va audio darslar)\n\nKursga yozilish yoki ma'lumot olish uchun quyidagi tugmani bosing:",
        ru: "📚 **Наши курсы:**\n\n1️⃣ **Начальный арабский** (Алфавит, фонетика, чтение)\n2️⃣ **Сарф и Нахв** (Грамматика и текст Корана)\n3️⃣ **Фусха Разговорный** (Свободное общение)\n\nНажмите кнопку ниже, чтобы записаться:",
        en: "📚 **Our Courses:**\n\n1️⃣ **Beginner Arabic** (Alphabet, phonetics, reading)\n2️⃣ **Sarf & Nahw** (Grammar & Quranic analysis)\n3️⃣ **Fusha Conversation** (Fluent speaking)\n\nClick the button below to enroll:"
      },
      {
        key: 'btn_enroll',
        uz: "✍️ Kursga yozilish",
        ru: "✍️ Записаться на курс",
        en: "✍️ Enroll in Course"
      },
      {
        key: 'ask_group_code',
        uz: "Iltimos, guruhga kirish maxsus kodini kiriting:",
        ru: "Пожалуйста, введите код доступа к группе:",
        en: "Please enter the group access code:"
      },
      {
        key: 'group_success',
        uz: "✅ Tabriklaymiz! Kod to'g'ri. Guruhga qo'shilish tasdiqlandi. Guruh havolasi:",
        ru: "✅ Поздравляем! Код верный. Доступ в группу одобрен. Ссылка на группу:",
        en: "✅ Congratulations! Valid code. Join approved. Group link:"
      },
      {
        key: 'group_code_invalid',
        uz: "❌ Kod noto'g'ri kiritildi yoki bunday kod mavjud emas. Iltimos, qaytadan urinib ko'ring yoki adminga murojaat qiling.",
        ru: "❌ Неверный код. Пожалуйста, попробуйте снова или свяжитесь с администратором.",
        en: "❌ Invalid code. Please try again or contact the administrator."
      }
    ];

    for (const item of texts) {
      const exists = await this.query('SELECT id FROM system_translations WHERE key = $1', [item.key]);
      if (exists.rows.length === 0) {
        await this.query(
          'INSERT INTO system_translations (key, text_uz, text_ru, text_en) VALUES ($1, $2, $3, $4)',
          [item.key, item.uz, item.ru, item.en]
        );
      } else if (
        item.key === 'course_info_prompt' &&
        /250\s*000|300\s*000|350\s*000|250,000|300,000|350,000/.test(
          `${exists.rows[0].text_uz} ${exists.rows[0].text_ru} ${exists.rows[0].text_en}`
        )
      ) {
        await this.query(
          'UPDATE system_translations SET text_uz = $1, text_ru = $2, text_en = $3 WHERE key = $4',
          [item.uz, item.ru, item.en, item.key]
        );
      }
    }
  }
}

export const db = new DatabaseManager();
