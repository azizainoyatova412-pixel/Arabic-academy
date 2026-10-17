import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { config, reloadConfig } from './config.js';
import { db } from './db/index.js';
import { botManager } from './bot/manager.js';
import { apiRouter } from './routes/api.js';
import { syncAcademyStats } from './services/academySync.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// REST API
app.use('/api', apiRouter);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    dbEngine: db.getEngine(),
  });
});

// Xatoliklarni ushlab qolish middleware (Server yiqilmasligi kafolati)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Express Global Error]:', err);
  res.status(500).json({
    success: false,
    message: "Serverda kutilmagan xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
  });
});

// .env fayli o'zgarishini kuzatish (Token o'zgarsa darhol yangi tokenga o'tish)
function setupEnvWatcher() {
  const envFilePath = path.resolve(__dirname, '..', '.env');
  let lastToken = config.botToken;

  if (fs.existsSync(envFilePath)) {
    fs.watchFile(envFilePath, { interval: 1000 }, async (curr, prev) => {
      if (curr.mtimeMs !== prev.mtimeMs) {
        console.log('🔄 [EnvWatcher] .env fayli o\'zgardi, sozlamalar qayta yuklanmoqda...');
        reloadConfig();

        if (config.botToken !== lastToken) {
          console.log('🔑 [EnvWatcher] Bot tokeni o\'zgardi! Bot yangi sozlamalar bilan qayta ishga tushirilmoqda...');
          lastToken = config.botToken;
          await botManager.restart();
        }
      }
    });
  }
}

// Global xatoliklarni ushlab qolish (Bot va Server hech qachon o'lib qolmasligi uchun)
process.on('uncaughtException', (err) => {
  console.error('💥 [Global uncaughtException]:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 [Global unhandledRejection]:', reason);
});

// Graceful shutdown funksiyasi
function setupShutdown(server: any) {
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Server to'xtatilmoqda (${signal})...`);
    try {
      await botManager.stop();
    } catch (e) {
      console.warn('Botni to\'xtatishda ogohlantirish:', e);
    }
    server.close(() => {
      console.log('Backend to\'xtatildi.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Server va Botni ishga tushirish
async function bootstrap() {
  try {
    console.log('🚀 [Backend] Tizim ishga tushirilmoqda...');

    // 1. Bazani initsializatsiya qilish (Token'dan mustaqil, ma'lumotlar yo'qolmaydi)
    await db.init();

    if (config.academyApiUrl && config.academySyncSecret) {
      let statsSyncInFlight = false;
      const syncBotStats = async () => {
        if (statsSyncInFlight) return;
        statsSyncInFlight = true;
        try {
          await syncAcademyStats();
        } catch (error: any) {
          console.warn('[Academy Sync] Sinxronlash amalga oshmadi:', error.message);
        } finally {
          statsSyncInFlight = false;
        }
      };
      void syncBotStats();
      const syncInterval = setInterval(syncBotStats, 30000);
      syncInterval.unref();
    } else {
      console.warn('[Academy Sync] Statistika sinxronlash o‘chiq: ACADEMY_API_URL va ACADEMY_SYNC_SECRET kerak.');
    }

    // 2. Telegram botni ishga tushirish
    await botManager.start();

    // 3. .env faylini kuzatish
    setupEnvWatcher();

    // 4. Express serverni tinglash
    const server = app.listen(config.port, () => {
      console.log(`🌐 [Backend API] Server http://localhost:${config.port} da muvaffaqiyatli ishlayapti`);
    });

    // Graceful shutdown o'rnatish
    setupShutdown(server);
  } catch (error) {
    console.error('❌ [Bootstrap Fatal Error]:', error);
  }
}

bootstrap();
