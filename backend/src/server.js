const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const db = require('./db/index');
const leaderboardController = require('./controllers/leaderboardController');
const adminController = require('./controllers/adminController');
const contentController = require('./controllers/contentController');
const bookController = require('./controllers/bookController');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/uploads/books/:filename', bookController.serveBookFile);

// Uploads jildini statik sifatida ko'rsatish
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const resultUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new Error('Faqat JPEG, PNG yoki WebP rasmlarini yuborish mumkin'));
      return;
    }
    callback(null, true);
  },
});

const parseResultUpload = (req, res, next) => {
  resultUpload.single('image')(req, res, (error) => {
    if (error) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: error.message });
    }
    next();
  });
};

// PDF Kitoblar yuklash uchun multer sozlamasi
const uploadBook = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

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
app.get('/api/results/:id/image', contentController.getResultImage);
app.get('/api/reviews', contentController.getReviews);
app.get('/api/public-config', (_req, res) => {
  const contact = (process.env.ADMIN_TELEGRAM_CONTACT || process.env.ADMIN_TELEGRAM_ID || '8145529224').trim();
  const telegramAdminUrl = /^https?:\/\//i.test(contact)
    ? contact
    : /^\d+$/.test(contact)
      ? `tg://user?id=${contact}`
      : `https://t.me/${contact.replace(/^@/, '')}`;
  res.json({ telegramAdminUrl });
});

// ============================================================
// ADMIN API endpointlari (x-admin-key header bilan himoyalangan)
// ============================================================
// Runtime'da o'zgartiriladigan parol (server qayta ishga tushganda .env ga qaytadi)
let runtimePassword = process.env.ADMIN_PASSWORD || 'admint';

const adminGuard = (req, res, next) => {
  const providedKey = req.headers['x-admin-key'];
  if (providedKey && providedKey === runtimePassword) return next();
  res.status(401).json({ error: 'Ruxsatsiz kirish – admin kaliti noto‘g‘ri' });
};

const botSyncGuard = (req, res, next) => {
  const expected = (process.env.BOT_SYNC_SECRET || process.env.ACADEMY_SYNC_SECRET || '').trim();
  const provided = (req.get('x-bot-sync-secret') || '').trim();
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (!expected || expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
    return res.status(401).json({ error: 'Ruxsatsiz bot sinxronlash' });
  }
  next();
};

// Parolni o'zgartirish endpointi
app.put('/api/admin/change-password', adminGuard, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.trim().length < 6) {
    return res.status(400).json({ error: 'Yangi parol kamida 6 ta belgidan iborat bo\'lishi kerak' });
  }
  runtimePassword = newPassword.trim();

  // .env fayliga ham yozib qo'yish (server qayta yonganda ham saqlanishi uchun)
  try {
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('ADMIN_PASSWORD=')) {
        envContent = envContent.replace(/ADMIN_PASSWORD=.*(\r?\n|$)/, `ADMIN_PASSWORD=${runtimePassword}$1`);
      } else {
        envContent += `\nADMIN_PASSWORD=${runtimePassword}\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
    }
  } catch (err) {
    console.error('.env yangilashda xato:', err.message);
  }

  res.json({ success: true, message: 'Parol muvaffaqiyatli o\'zgartirildi' });
});


// Guruhlar
app.get('/api/admin/groups', adminGuard, adminController.getGroups);
app.post('/api/admin/groups', adminGuard, adminController.createGroup);
app.delete('/api/admin/groups/:groupId', adminGuard, adminController.deleteGroup);
app.get('/api/admin/groups/:groupId/students', adminGuard, adminController.getStudents);
app.post('/api/admin/groups/:groupId/students', adminGuard, adminController.addStudent);
app.get('/api/admin/groups/:groupId/stats', adminGuard, adminController.getGroupStats);
app.get('/api/admin/dashboard-stats', adminGuard, adminController.getDashboardStats);

// Baholash
app.put('/api/admin/students/:studentId/lesson-grade', adminGuard, adminController.updateLessonGrade);
app.put('/api/admin/students/:studentId/grade', adminGuard, adminController.updateGrade);
app.delete('/api/admin/groups/:groupId/students/:studentId', adminGuard, adminController.deleteStudent);

// Natijalar (skrinshotlar)
app.post('/api/admin/results', adminGuard, parseResultUpload, contentController.addResult);
app.delete('/api/admin/results/:id', adminGuard, contentController.deleteResult);

// Sharhlar
app.get('/api/admin/reviews', adminGuard, contentController.getAdminReviews);
app.patch('/api/admin/reviews/:id/status', adminGuard, contentController.updateReviewStatus);
app.delete('/api/admin/reviews/:id', adminGuard, contentController.deleteReview);

// PDF Kitoblar va Darsliklar
app.get('/api/admin/books', adminGuard, bookController.getBooks);
app.post('/api/admin/books', adminGuard, uploadBook.single('pdf'), bookController.uploadBook);
app.delete('/api/admin/books/:id', adminGuard, bookController.deleteBook);
app.post('/api/admin/groups/:groupId/attach-book', adminGuard, bookController.attachBookToGroup);

// Botdan kelgan sharh/statistika (shared secret bilan himoyalanadi)
app.post('/api/bot/reviews', botSyncGuard, contentController.submitBotReview);
app.post('/api/bot/verify-group-code', botSyncGuard, adminController.verifyBotGroupCode);
app.post('/api/bot/stats', botSyncGuard, adminController.syncBotStats);
app.post('/api/bot/student-stats', botSyncGuard, adminController.getBotStudentStats);
app.post('/api/bot/books', botSyncGuard, bookController.getBotBooks);
app.post('/api/bot/books/:id', botSyncGuard, bookController.getBotBook);
app.post('/api/bot/groups/:groupId/book', botSyncGuard, bookController.getBotGroupBook);

// ============================================================
// SERVER ISHGA TUSHIRISH
// ============================================================
// Qidiriladigan ehtimoliy frontend build manzillari
const candidatePaths = [
  path.join(__dirname, '..', 'build'),                   // backend/build
  path.join(__dirname, '..', '..', 'frontend', 'build'), // ../frontend/build
  path.join(process.cwd(), 'build'),                     // cwd/build
  path.join(process.cwd(), 'frontend', 'build'),          // cwd/frontend/build
  path.join(process.cwd(), 'backend', 'build')            // cwd/backend/build
];

function resolveFrontendDir() {
  for (const p of candidatePaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
      return p;
    }
  }
  return null;
}

const frontendBuildPath = resolveFrontendDir();
if (frontendBuildPath) {
  console.log(`📦 [Frontend] Statik sahifa ulashilmoqda: ${frontendBuildPath}`);
  app.use(express.static(frontendBuildPath));
}

// Barcha boshqa GET so'rovlar (SPA client-side routing) — Express 5 mosligi
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }

  const activeDir = resolveFrontendDir();
  if (activeDir) {
    return res.sendFile(path.join(activeDir, 'index.html'));
  }

  res.status(503).type('html').send(`
    <!doctype html>
    <html lang="uz">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Uzbikiyya | Build kutilmoqda</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; max-width: 520px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
        h1 { color: #38bdf8; margin: 0 0 16px 0; font-size: 1.5rem; }
        p { color: #94a3b8; line-height: 1.6; margin: 0 0 14px 0; font-size: 0.95rem; }
        .code { background: #0f172a; padding: 10px 14px; border-radius: 8px; font-family: monospace; color: #facc15; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Frontend Build Topilmadi</h1>
        <p>Backend server muvaffaqiyatli ishga tushgan, lekin React frontend build fayllari topilmadi.</p>
        <p>Render Dashboard-da <b>Build Command</b> sozlamasini quyidagicha qiling:</p>
        <div class="code">npm run build</div>
      </div>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Api server localhost:${PORT} portida ishga tushdi`);
  await db.initDb();

  // ============================================================
  // ANTI-SLEEP AUTO SELF-PING (Render 15 daqiqada uxlab qolmasligi uchun)
  // ============================================================
  const PING_INTERVAL_MS = 12 * 60 * 1000; // Har 12 daqiqada ping yuborish
  const selfUrl = process.env.RENDER_EXTERNAL_URL || process.env.SELF_PING_URL || 'https://arabic-academy.onrender.com';

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
