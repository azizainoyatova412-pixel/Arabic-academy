const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 [RENDER BUILD] Universal build jarayoni boshlandi...');

// 1. Frontend katalogini qidirish
const candidates = [
  path.join(__dirname, '..', '..', 'frontend'),
  path.join(__dirname, '..', 'frontend'),
  path.join(process.cwd(), 'frontend'),
  path.join(process.cwd(), '..', 'frontend')
];

const frontendDir = candidates.find(dir => fs.existsSync(path.join(dir, 'package.json')));

if (!frontendDir) {
  console.error('❌ [RENDER BUILD] Frontend papkasi topilmadi!');
  process.exit(1);
}

console.log(`📁 [RENDER BUILD] Frontend joylashuvi topildi: ${frontendDir}`);

// Agar postinstall dan chaqirilgan bo'lsa va build allaqachon mavjud bo'lsa, qayta compile qilish shart emas
const targetBuild = path.join(__dirname, '..', 'build');
const sourceBuild = path.join(frontendDir, 'build');

if (process.env.npm_lifecycle_event === 'postinstall' && (fs.existsSync(path.join(targetBuild, 'index.html')) || fs.existsSync(path.join(sourceBuild, 'index.html')))) {
  console.log('⚡ [RENDER BUILD] Build mavjud, postinstall qayta yig\'ishni o\'tkazib yubordi.');
  if (fs.existsSync(sourceBuild) && !fs.existsSync(targetBuild)) {
    fs.cpSync(sourceBuild, targetBuild, { recursive: true });
  }
  process.exit(0);
}

// 2. Frontend dependencies o'rnatish
try {
  console.log('⏳ [RENDER BUILD] Frontend kutubxonalarini o\'rnatish (npm install)...');
  execSync('npm install --production=false', { cwd: frontendDir, stdio: 'inherit' });
} catch (err) {
  console.error('❌ [RENDER BUILD] Frontend npm install xatosi:', err.message);
  process.exit(1);
}

// Favicon generatsiyasi
try {
  const favScript = path.join(__dirname, 'generate-favicon.js');
  if (fs.existsSync(favScript)) {
    require('./generate-favicon');
  }
} catch (e) {
  console.warn('Favicon generation warning:', e.message);
}

// 3. Frontend production build yaratish
try {
  console.log('🔨 [RENDER BUILD] React production bundle yaratilmoqda (npm run build)...');
  execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });
} catch (err) {
  console.error('❌ [RENDER BUILD] React build xatosi:', err.message);
  process.exit(1);
}

// 4. Yaratilgan build/ ni backend/build ga ko'chirish
if (fs.existsSync(sourceBuild)) {
  console.log(`📋 [RENDER BUILD] Build ko'chirilmoqda: ${sourceBuild} -> ${targetBuild}`);
  if (!fs.existsSync(targetBuild)) {
    fs.mkdirSync(targetBuild, { recursive: true });
  }
  fs.cpSync(sourceBuild, targetBuild, { recursive: true });
  console.log('✅ [RENDER BUILD] Frontend muvaffaqiyatli backend/build ga joylashtirildi!');
} else {
  console.error('❌ [RENDER BUILD] Frontend build/ papkasi topilmadi!');
  process.exit(1);
}

console.log('🎉 [RENDER BUILD] Barcha build bosqichlari muvaffaqiyatli yakunlandi!');
