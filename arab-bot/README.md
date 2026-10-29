# Arab Tili Boti va Admin Paneli — Versiya 4.0 🌟

Arab tili o'quv markazi uchun grammY Telegram boti va uning API backend'i.

---

## 🎨 Yangi Dizayn Tizimi (Warm Terracotta & Arabic Elegance)

- **Ranglar**:
  - Sahifa foni: `#F7EFE9` (Warm Cream)
  - Matnlar: `#3D200F` (Deep Espresso), `#6E4F39` (Soft Brown)
  - Asosiy urg'u (Accent): `#8C5A3C` (Terracotta Brown), `#FAF4EF` (Card Panel)
  - Oltin aksent: `#C59858`
- **Shriftlar**: Google Fonts (Amiri, Playfair Display, Plus Jakarta Sans).
- Hech qanday texnologiya ko'rsatkichlari (Gemini Active, Node.js va h.k.) ko'rsatilmaydi — toza, minimalistik va professional interfeys.

---

## 🚀 Ishga Tushirish

Loyihani bitta buyruq bilan ishga tushirish mumkin:

```powershell
# arab-bot papkasiga kiring
cd arab-bot

# Lokal ishga tushirish uchun .env faylini yarating
if (Test-Path .env.example) { Copy-Item .env.example .env } else { New-Item -ItemType File .env }

# .env faylida kamida BOT_TOKEN va ADMIN_ID qiymatlarini to'ldiring

# Bog'liqliklarni o'rnating
npm install

# Bot va API'ni ishga tushiring
npm start
```

- 🌐 **Backend API**: `http://localhost:5000`
- Admin boshqaruvi asosiy saytning yagona admin panelida amalga oshiriladi.
- `.env` va maxfiy sozlamalar GitHub'ga qo'shilmaydi. Render'da ularni Dashboard → Environment bo'limiga kiriting; haqiqiy token va parollarni hech qachon repoga yubormang.
- Bot tokenisiz API ishga tushishi mumkin, ammo Telegram bot ishlamaydi. `.env` ichidagi `BOT_TOKEN`ga @BotFather bergan tokenni kiriting.
- `DATABASE_URL` bo'sh qolsa lokal SQLite avtomatik ishlatiladi.

---

## 🎯 Bot Imkoniyatlari (v4)

1. **`/start`** → saytdagi guruhga biriktirilgan kodni so'raydi.
   - Kod yagona sayt admin panelidagi guruh kartasida ko'rsatiladi. Kod tasdiqlangach o'quvchi shu guruhga yoziladi va bot menyusi ochiladi.
2. **`/review`** → o'quvchi sharhini sayt adminiga tasdiqlash uchun yuboradi.
3. **📊 Sayt statistikasi**:
   - O'quvchining baholari va guruhdagi reytingi sayt admin panelidagi ma'lumotlardan olinadi.
4. **🧑‍🏫 Ustozlar uchun cheklangan kirish (`/ustoz`)**:
   - Ustoz botda `/ustoz` buyrug'i va parolni (standart: `123`, `.env`dagi `TEACHER_ACCESS_CODE`) kiritadi.
   - Ustozga **faqat baho qo'yish** imkoniyati beriladi: guruhni tanlaydi -> o'quvchini tanlaydi -> 1 dan 5 gacha baho qo'yadi.
5. **📞 Aloqa va Yordam**:
   - Admin Telegram havolasi (`ADMIN_TELEGRAM_CONTACT`) ko'rsatiladi.
6. **👥 Guruhlar**:
   - Guruh tanlanganda kirish kodi so'raladi va to'g'ri bo'lsa qabul qilinadi.
7. **📘 Kitob asosida test**:
   - Savollar saytda o'quvchi guruhiga biriktirilgan kitobdan tuziladi; test murakkabligi shu guruhdagi oxirgi test natijasiga moslashadi.
   - Guruhga kitob biriktirilmagan bo'lsa test boshlanmaydi. Alifbo va harflarni yodlashga oid umumiy savollar berilmaydi.
8. **🤖 AI Ustoz**:
   - O'quvchi sayt admin paneliga yuklangan kitobni tanlaydi; savollar faqat tanlangan kitob PDF matnidan tuziladi va javoblar shu matn bo'yicha tekshiriladi.

---

## 🔗 Sayt bilan ulanish

Botni sayt bilan doimiy ulash uchun bot service environment'ida quyidagilarni sozlang:

```env
ACADEMY_API_URL=https://arabic-academy.onrender.com
ACADEMY_ADMIN_URL=https://arabic-academy.onrender.com/admin
ACADEMY_SYNC_SECRET=<site bilan bir xil kuchli sir>
ADMIN_TELEGRAM_CONTACT=<@aishauzbikiyya_admin>
```

- Botdagi statistika sayt admin paneliga har 30 soniyada yuboriladi.
- `/review` orqali yuborilgan sharhlar sayt admini tasdiqlamaguncha ommaga ko'rinmaydi.
- O'quvchilar botda dars/test bilan shug'ullanadi va o'z baho-statistikasini ko'radi.
- O'quvchi natijalari va sertifikat rasmlarini administrator sayt admin panelidagi **Natijalar** bo'limidan yuklaydi. Rasmlar PostgreSQL bazasida saqlanadi va redeploydan keyin ham qoladi.
- Saytda sharh yozish formasi yo'q: o'quvchilar sharhni botdagi `/review` orqali yuboradi, admin tasdiqlagandan keyin saytda ko'rsatiladi.
- `/admin` botdagi admin ID uchun saytning yagona admin panel havolasini beradi.
- Render'da shu repodan alohida **Background Worker** ishga tushiriladi; yangi GitHub repo yoki Google hisobi kerak emas. Worker alohida instance bo'lgani uchun sayt web service'ining CPU/RAM'ini bo'lishmaydi, lekin Render rejasi bo'yicha qo'shimcha xarajat bo'lishi mumkin.
- `render.yaml` worker sozlamasini o'z ichiga oladi. Worker'da `BOT_TOKEN`, `GEMINI_API_KEY`, `ADMIN_ID`, `ADMIN_PASSWORD`, `ACADEMY_API_URL`, `ACADEMY_SYNC_SECRET` va `BOT_DATABASE_URL` qiymatlarini kiriting.
- Worker Node.js `22.13.0` yoki undan yangi versiyada ishlashi kerak.
- `ACADEMY_API_URL` saytning haqiqiy Render URL'i bo'lishi kerak. `ACADEMY_SYNC_SECRET` qiymatini saytdagi `BOT_SYNC_SECRET` bilan aynan bir xil qiling.
- Production bot sozlamasida `ACADEMY_API_URL` hech qachon `localhost` bo'lmasin; Render worker ichidagi localhost sayt backend'i emas.
- Bot AI Ustoz kitoblar ro'yxati va PDF fayllarini saytning bot-sync bilan himoyalangan API endpointlaridan oladi; sayt va bot service'dagi secretlar bir xil bo'lishi kerak.
- Worker'dagi `BOT_DATABASE_URL` uchun saytning mavjud `DATABASE_URL` qiymatini ishlatish mumkin; `BOT_DATABASE_SCHEMA=arab_bot` bot jadvallarini alohida schema'da yaratadi. Shu sabab sayt va botning `users`/`groups` jadvallari aralashmaydi va alohida ma'lumotlar bazasi ochish shart emas. PostgreSQL foydalanuvchisida yangi schema yaratish huquqi bo'lishi kerak.
- Agar PostgreSQL ulanishi yoki schema yaratish ishlamasa, bot SQLite'ga o'tadi; Render'da uning ma'lumotlari redeploy/restartda saqlanmasligi mumkin.
- O'quvchi botdagi statistika bo'limida sayt guruhlaridagi o'z baholari va reytingini ko'rishi uchun `ACADEMY_SYNC_SECRET` qiymatini sayt backend'idagi `BOT_SYNC_SECRET` bilan aynan bir xil qiling.
- Telegram bot faqat shu `arab-bot` servisida ishlashi kerak. Sayt backend'ida ham bot polling ishlayotgan eski deploy bo'lsa, saytni qayta deploy qiling va `BOT_TOKEN`ni faqat bot service'da qoldiring; aks holda Telegram `409 Conflict` qaytarishi mumkin.
