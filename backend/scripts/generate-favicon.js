const fs = require('fs');
const path = require('path');

const candidates = [
  path.join(__dirname, '../../frontend/public/logo.jpg'),
  path.join(__dirname, '../uploads/logo.jpg'),
  path.join(process.cwd(), 'frontend/public/logo.jpg'),
];

const logoPath = candidates.find(p => fs.existsSync(p));
if (!logoPath) {
  console.error('Logo file not found!');
  process.exit(1);
}

const buf = fs.readFileSync(logoPath);
const b64 = buf.toString('base64');
const dataUri = `data:image/jpeg;base64,${b64}`;

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 128 128">
  <defs>
    <clipPath id="rounded-clip">
      <rect width="128" height="128" rx="32" ry="32" />
    </clipPath>
  </defs>
  <rect width="128" height="128" rx="32" fill="#3D200F" />
  <image href="${dataUri}" xlink:href="${dataUri}" width="128" height="128" preserveAspectRatio="xMidYMid slice" clip-path="url(#rounded-clip)" />
</svg>
`;

const publicFavicon = path.join(__dirname, '../../frontend/public/favicon.svg');
const buildFavicon = path.join(__dirname, '../../frontend/build/favicon.svg');
const backendBuildFavicon = path.join(__dirname, '../build/favicon.svg');

fs.writeFileSync(publicFavicon, svgContent, 'utf8');
console.log('✅ frontend/public/favicon.svg yaratildi');

if (fs.existsSync(path.dirname(buildFavicon))) {
  fs.writeFileSync(buildFavicon, svgContent, 'utf8');
  console.log('✅ frontend/build/favicon.svg yaratildi');
}

if (fs.existsSync(path.dirname(backendBuildFavicon))) {
  fs.writeFileSync(backendBuildFavicon, svgContent, 'utf8');
  console.log('✅ backend/build/favicon.svg yaratildi');
}

console.log('🎉 Favicon logo.jpg bilan to‘liq integratsiya qilindi!');
