import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// .env faylini loyiha ildiziga (..\) qarab o‘qish
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath, override: true });

export interface AppConfig {
  port: number;
  adminPort: number;
  adminPanelUrl: string;
  databaseUrl: string;
  databaseSchema: string;
  botToken: string;
  geminiApiKey: string;
  geminiApiKey2: string;
  adminPassword: string;
  adminId: string;
  adminTelegramContact: string;
  academyApiUrl: string;
  academyAdminUrl: string;
  academySyncSecret: string;
  academySyncSecretSource: 'BOT_SYNC_SECRET' | 'ACADEMY_SYNC_SECRET' | '';
  academySyncSecretsConflict: boolean;
  telegramWebhookUrl: string;
  telegramWebhookSecret: string;
}

function getAcademySyncSecret(): {
  secret: string;
  source: AppConfig['academySyncSecretSource'];
  conflict: boolean;
} {
  const botSecret = (process.env.BOT_SYNC_SECRET || '').trim();
  const academySecret = (process.env.ACADEMY_SYNC_SECRET || '').trim();
  if (botSecret) {
    return {
      secret: botSecret,
      source: 'BOT_SYNC_SECRET',
      conflict: Boolean(academySecret && academySecret !== botSecret),
    };
  }
  if (academySecret) {
    return { secret: academySecret, source: 'ACADEMY_SYNC_SECRET', conflict: false };
  }

  return { secret: '', source: '', conflict: false };
}

function parseAdminId(): string {
  const raw = (process.env.ADMIN_ID || '8145529224').trim().replace(/^@/, '');
  return raw;
}

const academySyncSecret = getAcademySyncSecret();

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  adminPort: parseInt(process.env.ADMIN_PORT || '3000', 10),
  adminPanelUrl: process.env.ADMIN_PANEL_URL || 'http://localhost:3000',
  databaseUrl: (process.env.BOT_DATABASE_URL || process.env.DATABASE_URL || '').trim(),
  databaseSchema: (process.env.BOT_DATABASE_SCHEMA || 'public').trim(),
  botToken: (process.env.BOT_TOKEN || '').trim(),
  geminiApiKey: (process.env.GEMINI_API_KEY || '').trim(),
  geminiApiKey2: (process.env.GEMINI_API_KEY_2 || '').trim(),
  adminPassword: (process.env.ADMIN_PASSWORD || '123').trim(),
  adminId: parseAdminId(),
  adminTelegramContact: (process.env.ADMIN_TELEGRAM_CONTACT || '').trim(),
  // .env‑da ko‘rsatilgan URL‑lar, oxirgi “/” olib tashlanadi
  academyApiUrl: (process.env.ACADEMY_API_URL || '').trim().replace(/\/$/, ''),
  academyAdminUrl: (process.env.ACADEMY_ADMIN_URL || '').trim().replace(/\/$/, ''),
  academySyncSecret: academySyncSecret.secret,
  academySyncSecretSource: academySyncSecret.source,
  academySyncSecretsConflict: academySyncSecret.conflict,
  telegramWebhookUrl: (process.env.TELEGRAM_WEBHOOK_URL || process.env.RENDER_EXTERNAL_URL || '').trim().replace(/\/$/, ''),
  telegramWebhookSecret: (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim(),
};

export function reloadConfig(): AppConfig {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
      process.env[k] = envConfig[k];
    }
  }
  // Yangilangan qiymatlarni config ob'ektiga tiklaymiz
  config.port = parseInt(process.env.PORT || '5000', 10);
  config.adminPort = parseInt(process.env.ADMIN_PORT || '3000', 10);
  config.adminPanelUrl = process.env.ADMIN_PANEL_URL || 'http://localhost:3000';
  config.databaseUrl = (process.env.BOT_DATABASE_URL || process.env.DATABASE_URL || '').trim();
  config.databaseSchema = (process.env.BOT_DATABASE_SCHEMA || 'public').trim();
  config.botToken = (process.env.BOT_TOKEN || '').trim();
  config.geminiApiKey = (process.env.GEMINI_API_KEY || '').trim();
  config.geminiApiKey2 = (process.env.GEMINI_API_KEY_2 || '').trim();
  config.adminPassword = (process.env.ADMIN_PASSWORD || '123').trim();
  config.adminId = parseAdminId();
  config.adminTelegramContact = (process.env.ADMIN_TELEGRAM_CONTACT || '').trim();
  config.academyApiUrl = (process.env.ACADEMY_API_URL || '').trim().replace(/\/$/, '');
  config.academyAdminUrl = (process.env.ACADEMY_ADMIN_URL || '').trim().replace(/\/$/, '');
  const academySyncSecret = getAcademySyncSecret();
  config.academySyncSecret = academySyncSecret.secret;
  config.academySyncSecretSource = academySyncSecret.source;
  config.academySyncSecretsConflict = academySyncSecret.conflict;
  config.telegramWebhookUrl = (process.env.TELEGRAM_WEBHOOK_URL || process.env.RENDER_EXTERNAL_URL || '').trim().replace(/\/$/, '');
  config.telegramWebhookSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
  return config;
}
