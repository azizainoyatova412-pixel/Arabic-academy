const { Pool } = require('pg');
require('dotenv').config();

// Neon va boshqa cloud PostgreSQL uchun sozlash:
// node-postgres channel_binding parametrini qo'llab-quvvatlamaydi, uni olib tashlaymiz
let rawUrl = (process.env.DATABASE_URL || '').trim();
rawUrl = rawUrl.replace(/&?channel_binding=[^&]*/g, '');

const isCloudDb = rawUrl.includes('neon.tech') || rawUrl.includes('sslmode=require');

const pool = new Pool({
  connectionString: rawUrl,
  ssl: isCloudDb ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => {
  if (/ECONNRESET|Connection terminated|closed/i.test(err.message || '')) {
    return; // Neon bo'sh ulanishni yopganda kutish, query() avtomatik yangisini ochadi
  }
  console.error('❌ PostgreSQL ulanishida xatolik:', err.message);
});

// Neon yoki multi-schema muhitda doim public schemani ishlatish
pool.on('connect', (client) => {
  client.query('SET search_path TO public').catch(() => {});
});

// Bazadagi jadvallarni avtomatik yaratish va dastlabki test ma'lumotlarini kiritish
const initDb = async () => {
  if (!rawUrl || rawUrl.includes('parol@localhost')) {
    console.warn('⚠️ Diqqat: Haqiqiy PostgreSQL DATABASE_URL kiritilmagan.');
    return;
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        telegram_id BIGINT PRIMARY KEY,
        full_name TEXT NOT NULL,
        lang VARCHAR(10) DEFAULT 'uz',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT REFERENCES users(telegram_id),
        group_id INT NOT NULL,
        check_file_id TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT REFERENCES users(telegram_id),
        group_id INT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        current_month_points INT DEFAULT 0,
        total_points INT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(telegram_id, group_id)
      );

      CREATE TABLE IF NOT EXISTS results_showcase (
        id SERIAL PRIMARY KEY,
        filename TEXT,
        image_data BYTEA,
        image_content_type TEXT,
        caption TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE results_showcase ALTER COLUMN filename DROP NOT NULL;
      ALTER TABLE results_showcase ADD COLUMN IF NOT EXISTS image_data BYTEA;
      ALTER TABLE results_showcase ADD COLUMN IF NOT EXISTS image_content_type TEXT;

      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        text TEXT NOT NULL,
        stars INT DEFAULT 5,
        status VARCHAR(20) NOT NULL DEFAULT 'approved',
        telegram_id BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'approved';
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS telegram_id BIGINT;

      CREATE TABLE IF NOT EXISTS bot_stats_snapshots (
        id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        stats JSONB NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS monthly_grades (
        id SERIAL PRIMARY KEY,
        group_id INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        telegram_id BIGINT NOT NULL,
        month_key VARCHAR(30) NOT NULL,
        lesson_grades JSONB DEFAULT '{}'::jsonb,
        total_points INT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, telegram_id, month_key)
      );

      ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS lesson_grades JSONB DEFAULT '{}'::jsonb;

      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        pdf_path TEXT NOT NULL,
        file_size BIGINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE books ADD COLUMN IF NOT EXISTS pdf_data BYTEA;
      ALTER TABLE books ADD COLUMN IF NOT EXISTS pdf_content_type TEXT NOT NULL DEFAULT 'application/pdf';

      ALTER TABLE groups ADD COLUMN IF NOT EXISTS book_name TEXT;
      ALTER TABLE groups ADD COLUMN IF NOT EXISTS book_pdf_path TEXT;
      ALTER TABLE groups ADD COLUMN IF NOT EXISTS access_code VARCHAR(16);
      UPDATE groups
      SET access_code = upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))
      WHERE access_code IS NULL OR btrim(access_code) = '';
      WITH duplicate_codes AS (
        SELECT id, row_number() OVER (PARTITION BY upper(access_code) ORDER BY id) AS code_rank
        FROM groups
        WHERE access_code IS NOT NULL
      )
      UPDATE groups g
      SET access_code = upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))
      FROM duplicate_codes d
      WHERE g.id = d.id AND d.code_rank > 1;
      CREATE UNIQUE INDEX IF NOT EXISTS groups_access_code_unique ON groups (upper(access_code));

      ALTER TABLE users ADD COLUMN IF NOT EXISTS language_code VARCHAR(10) DEFAULT 'uz';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS academy_group_id INTEGER;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS academy_group_name VARCHAR(150);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS grade INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_teacher BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS student_code VARCHAR(10);
      ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

    `);
    console.log('✅ Baza jadvallari (users, groups, books, monthly_grades) tekshirildi va tayyor.');

    // Namunaviy test ma'lumotlarini qo'shish (agar o'quvchilar bo'lmasa)
    const checkUsers = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(checkUsers.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO users (telegram_id, full_name, lang) VALUES 
        (1001, 'Ali Valiyev', 'uz'),
        (1002, 'Madina Karimova', 'uz'),
        (1003, 'Jasur Bekmirzayev', 'uz'),
        (1004, 'Fotima Umarova', 'uz')
        ON CONFLICT DO NOTHING;

        INSERT INTO enrollments (telegram_id, group_id, status, current_month_points, total_points) VALUES 
        (1001, 1, 'active', 95, 280),
        (1002, 1, 'active', 88, 250),
        (1003, 1, 'active', 75, 210),
        (1004, 1, 'active', 60, 180),
        (1001, 2, 'active', 90, 240),
        (1002, 2, 'active', 85, 220)
        ON CONFLICT DO NOTHING;
      `);
      console.log("🎉 Test uchun namunaviy o'quvchilar reytingi qo'shildi!");
    }
  } catch (err) {
    console.error("⚠️ Baza jadvallarini avto-yaratishda xatolik:", err.message);
  }
};

const query = async (text, params, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      const isTransient = /ECONNRESET|Connection terminated|closed|timeout|socket/i.test(err.message || '');
      if (isTransient && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
        continue;
      }
      throw err;
    }
  }
};

const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('❌ PostgreSQL tranzaksiyasini bekor qilishda xatolik:', rollbackError.message);
    }
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  query,
  transaction,
  initDb,
};