const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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
// HEALTH CHECK VA ANTI-SLEEP PING ENDPOINTLARI
// ============================================================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server faol va ishlamoqda',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/ping', (req, res) => {
  res.status(200).send('pong');
});

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
const frontendBuildPath = path.join(__dirname, '..', '..', 'frontend', 'build');
const frontendIndexPath = path.join(frontendBuildPath, 'index.html');

if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  app.get(/^(?!\/api).*/, (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(frontendIndexPath);
  });
} else {
  app.get('/', (req, res) => {
    res.type('html').send(`
      <!doctype html>
      <html lang="uz">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Uzbikiyya | App is starting</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f7efe9; color: #3d200f; display: grid; place-items: center; min-height: 100vh; margin: 0; }
          .box { background: white; padding: 32px 28px; border-radius: 18px; box-shadow: 0 12px 28px rgba(61,32,15,.08); text-align: center; max-width: 620px; }
          h1 { margin-bottom: 12px; font-size: 2rem; }
          p { color: #6e4f39; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="box">
          <h1>Sayt tayyorlanmoqda</h1>
          <p>Frontend build hali tayyorlanmoqda. Server ishlayapti, lekin web sahifa allaqachon yuklanmayapti. Iltimos, Render build tugagach qayta yuklang.</p>
        </div>
      </body>
      </html>
    `);
  });

  app.get(/^(?!\/api).*/, (req, res) => {
    res.type('html').send(`
      <!doctype html>
      <html lang="uz">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Uzbikiyya | App is starting</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f7efe9; color: #3d200f; display: grid; place-items: center; min-height: 100vh; margin: 0; }
          .box { background: white; padding: 32px 28px; border-radius: 18px; box-shadow: 0 12px 28px rgba(61,32,15,.08); text-align: center; max-width: 620px; }
          h1 { margin-bottom: 12px; font-size: 2rem; }
          p { color: #6e4f39; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="box">
          <h1>Frontend build topilmadi</h1>
          <p>Render ishlayotgan serverda build hali tugamagan yoki build yo'li noto'g'ri. Iltimos, deployni qayta ishga tushiring.</p>
        </div>
      </body>
      </html>
    `);
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Api server localhost:${PORT} portida ishga tushdi`);
  await db.initDb();

  // ============================================================
  // ANTI-SLEEP AUTO SELF-PING (Render 15 daqiqada uxlab qolmasligi uchun)
  // ============================================================
  const PING_INTERVAL_MS = 12 * 60 * 1000; // Har 12 daqiqada ping yuborish
  const selfUrl = process.env.RENDER_EXTERNAL_URL || process.env.SELF_PING_URL || 'https://aisha-uzbikiyya-api.onrender.com';

  if (selfUrl) {
    const pingTarget = `${selfUrl.replace(/\/$/, '')}/api/health`;
    console.log(`⏱️ Anti-sleep self-ping sozlandi: ${pingTarget} har 12 daqiqada uyg'otib turiladi.`);

    setInterval(async () => {
      try {
        const response = await fetch(pingTarget);
        if (response.ok) {
          console.log(`💓 [Anti-Sleep] Self-ping muvaffaqiyatli: ${response.status} (${new Date().toLocaleTimeString()})`);
        }
      } catch (err) {
        console.warn(`⚠️ [Anti-Sleep] Ping urinishida ogohlantirish:`, err.message);
      }
    }, PING_INTERVAL_MS);
  }
});

const token = process.env.BOT_TOKEN || '';
if (token && token.includes(':')) {
  bot.start()
    .then(() => {
      console.log('🤖 Telegram bot ishga tushdi!');
    })
    .catch((err) => {
      console.error('❌ Telegram bot ishga tushmadi:', err.message);
    });
} else {
  console.log('ℹ️ Telegram BOT_TOKEN topilmadi yoki yaroqsiz. Bot o‘chirilgan holda ishlaydi.');
}