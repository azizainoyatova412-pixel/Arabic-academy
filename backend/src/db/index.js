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
});

pool.on('connect', () => {
  console.log('🐘 PostgreSQL bazasiga muvaffaqiyatli ulandi!');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL ulanishida xatolik:', err.message);
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
        filename TEXT NOT NULL,
        caption TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        text TEXT NOT NULL,
        stars INT DEFAULT 5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Baza jadvallari (users, payments, enrollments) tekshirildi va tayyor.');

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

module.exports = {
  query: (text, params) => pool.query(text, params),
  initDb,
};