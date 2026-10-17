"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.reloadConfig = reloadConfig;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const envPath = path_1.default.resolve(__dirname, '..', '.env');
dotenv_1.default.config({ path: envPath, override: true });
function parseAdminId() {
    const raw = (process.env.ADMIN_ID || '8145529224').trim().replace(/^@/, '');
    return raw;
}
exports.config = {
    port: parseInt(process.env.PORT || '5000', 10),
    adminPort: parseInt(process.env.ADMIN_PORT || '3000', 10),
    adminPanelUrl: process.env.ADMIN_PANEL_URL || 'http://localhost:3000',
    databaseUrl: (process.env.BOT_DATABASE_URL || process.env.DATABASE_URL || '').trim(),
    databaseSchema: (process.env.BOT_DATABASE_SCHEMA || '').trim(),
    botToken: (process.env.BOT_TOKEN || '').trim(),
    geminiApiKey: (process.env.GEMINI_API_KEY || '').trim(),
    geminiApiKey2: (process.env.GEMINI_API_KEY_2 || '').trim(),
    adminPassword: (process.env.ADMIN_PASSWORD || '123').trim(),
    adminId: parseAdminId(),
    adminTelegramContact: (process.env.ADMIN_TELEGRAM_CONTACT || '').trim(),
    academyApiUrl: (process.env.ACADEMY_API_URL || '').trim().replace(/\/$/, ''),
    academyAdminUrl: (process.env.ACADEMY_ADMIN_URL || '').trim().replace(/\/$/, ''),
    academySyncSecret: (process.env.ACADEMY_SYNC_SECRET || '').trim(),
};
function reloadConfig() {
    if (fs_1.default.existsSync(envPath)) {
        dotenv_1.default.config({ path: envPath, override: true });
        const envConfig = dotenv_1.default.parse(fs_1.default.readFileSync(envPath));
        for (const k in envConfig) {
            process.env[k] = envConfig[k];
        }
    }
    exports.config.port = parseInt(process.env.PORT || '5000', 10);
    exports.config.adminPort = parseInt(process.env.ADMIN_PORT || '3000', 10);
    exports.config.adminPanelUrl = process.env.ADMIN_PANEL_URL || 'http://localhost:3000';
    exports.config.databaseUrl = (process.env.BOT_DATABASE_URL || process.env.DATABASE_URL || '').trim();
    exports.config.databaseSchema = (process.env.BOT_DATABASE_SCHEMA || '').trim();
    exports.config.botToken = (process.env.BOT_TOKEN || '').trim();
    exports.config.geminiApiKey = (process.env.GEMINI_API_KEY || '').trim();
    exports.config.geminiApiKey2 = (process.env.GEMINI_API_KEY_2 || '').trim();
    exports.config.adminPassword = (process.env.ADMIN_PASSWORD || '123').trim();
    exports.config.adminId = parseAdminId();
    exports.config.adminTelegramContact = (process.env.ADMIN_TELEGRAM_CONTACT || '').trim();
    exports.config.academyApiUrl = (process.env.ACADEMY_API_URL || '').trim().replace(/\/$/, '');
    exports.config.academyAdminUrl = (process.env.ACADEMY_ADMIN_URL || '').trim().replace(/\/$/, '');
    exports.config.academySyncSecret = (process.env.ACADEMY_SYNC_SECRET || '').trim();
    return exports.config;
}
