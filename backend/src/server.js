const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const db = require('./db/index');
const bot = require('./bot/bot');
const leaderboardController = require('./controllers/leaderboardController');
const adminController = require('./controllers/adminController');
const contentController = require('./controllers/contentController');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Uploads jildini statik sifatida ko'rsatish
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Fayl yuklash uchun multer sozlamasi
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    const fs = require('fs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ============================================================
// ODDIY FOYDALANUVCHI (o'quvchi) API endpointlari
// ============================================================
app.get('/api/leaderboard/:groupId', leaderboardController.getLeaderboard);
app.get('/api/results', contentController.getResults);
app.get('/api/reviews', contentController.getReviews);

// ============================================================
// ADMIN API endpointlari (x-admin-key header bilan himoyalangan)
// ============================================================
const adminGuard = (req, res, next) => {
  const expectedKey = process.env.ADMIN_PASSWORD || 'admint';
  const providedKey = req.headers['x-admin-key'];

  if (providedKey && providedKey === expectedKey) return next();
  res.status(401).json({ error: 'Ruxsatsiz kirish' });
};

// Guruhlar
app.get('/api/admin/groups', adminGuard, adminController.getGroups);
app.post('/api/admin/groups', adminGuard, adminController.createGroup);
app.get('/api/admin/groups/:groupId/students', adminGuard, adminController.getStudents);
app.post('/api/admin/groups/:groupId/students', adminGuard, adminController.addStudent);

// Baholash
app.put('/api/admin/students/:studentId/grade', adminGuard, adminController.updateGrade);

// Natijalar (skrinshotlar)
app.post('/api/admin/results', adminGuard, upload.single('image'), contentController.addResult);
app.delete('/api/admin/results/:id', adminGuard, contentController.deleteResult);

// Sharhlar
app.post('/api/admin/reviews', adminGuard, contentController.addReview);
app.delete('/api/admin/reviews/:id', adminGuard, contentController.deleteReview);

// ============================================================
// SERVER ISHGA TUSHIRISH
// ============================================================
app.use(express.static(path.join(__dirname, '../frontend')));
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 API Server localhost:${PORT} portida ishlamoqda`);
  await db.initDb();

  const token = process.env.BOT_TOKEN || '';
  if (token && !token.includes('EXAMPLE') && token.includes(':')) {
    bot.start().then(() => {
      console.log('🤖 Telegram Bot muvaffaqiyatli ishga tushdi!');
    }).catch(err => {
      console.error('❌ Botda xatolik:', err.message || err);
    });
  } else {
    console.log('ℹ️ Eslatma: Haqiqiy BOT_TOKEN kiritilmagan. Bot hozircha ishga tushirilmadi.');
  }
});