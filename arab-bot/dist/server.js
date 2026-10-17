"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_js_1 = require("./config.js");
const index_js_1 = require("./db/index.js");
const manager_js_1 = require("./bot/manager.js");
const api_js_1 = require("./routes/api.js");
const academySync_js_1 = require("./services/academySync.js");
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/uploads', express_1.default.static(path_1.default.resolve(process.cwd(), 'uploads')));
// REST API
app.use('/api', api_js_1.apiRouter);
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        dbEngine: index_js_1.db.getEngine(),
    });
});
// Xatoliklarni ushlab qolish middleware (Server yiqilmasligi kafolati)
app.use((err, req, res, next) => {
    console.error('[Express Global Error]:', err);
    res.status(500).json({
        success: false,
        message: "Serverda kutilmagan xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
    });
});
// .env fayli o'zgarishini kuzatish (Token o'zgarsa darhol yangi tokenga o'tish)
function setupEnvWatcher() {
    const envFilePath = path_1.default.resolve(__dirname, '..', '.env');
    let lastToken = config_js_1.config.botToken;
    if (fs_1.default.existsSync(envFilePath)) {
        fs_1.default.watchFile(envFilePath, { interval: 1000 }, async (curr, prev) => {
            if (curr.mtimeMs !== prev.mtimeMs) {
                console.log('🔄 [EnvWatcher] .env fayli o\'zgardi, sozlamalar qayta yuklanmoqda...');
                (0, config_js_1.reloadConfig)();
                if (config_js_1.config.botToken !== lastToken) {
                    console.log('🔑 [EnvWatcher] Bot tokeni o\'zgardi! Bot yangi sozlamalar bilan qayta ishga tushirilmoqda...');
                    lastToken = config_js_1.config.botToken;
                    await manager_js_1.botManager.restart();
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
function setupShutdown(server) {
    const shutdown = async (signal) => {
        console.log(`\n🛑 Server to'xtatilmoqda (${signal})...`);
        try {
            await manager_js_1.botManager.stop();
        }
        catch (e) {
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
        await index_js_1.db.init();
        if (config_js_1.config.academyApiUrl && config_js_1.config.academySyncSecret) {
            let statsSyncInFlight = false;
            const syncBotStats = async () => {
                if (statsSyncInFlight)
                    return;
                statsSyncInFlight = true;
                try {
                    await (0, academySync_js_1.syncAcademyStats)();
                }
                catch (error) {
                    console.warn('[Academy Sync] Sinxronlash amalga oshmadi:', error.message);
                }
                finally {
                    statsSyncInFlight = false;
                }
            };
            void syncBotStats();
            const syncInterval = setInterval(syncBotStats, 30000);
            syncInterval.unref();
        }
        else {
            console.warn('[Academy Sync] Statistika sinxronlash o‘chiq: ACADEMY_API_URL va ACADEMY_SYNC_SECRET kerak.');
        }
        // 2. Telegram botni ishga tushirish
        await manager_js_1.botManager.start();
        // 3. .env faylini kuzatish
        setupEnvWatcher();
        // 4. Express serverni tinglash
        const server = app.listen(config_js_1.config.port, () => {
            console.log(`🌐 [Backend API] Server http://localhost:${config_js_1.config.port} da muvaffaqiyatli ishlayapti`);
        });
        // Graceful shutdown o'rnatish
        setupShutdown(server);
    }
    catch (error) {
        console.error('❌ [Bootstrap Fatal Error]:', error);
    }
}
bootstrap();
