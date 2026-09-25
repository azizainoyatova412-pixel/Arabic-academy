import React, { useState, useEffect } from 'react';
import '../index.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const content = {
  UZ: {
    nav: [
      { name: 'Biz haqimizda', href: '#about' },
      { name: 'Darslar', href: '#courses' },
      { name: 'Maqsadlar', href: '#goals' },
      { name: 'Ustoz', href: '#mentor' },
      { name: 'Natijalar', href: '#results' },
      { name: 'Sharhlar', href: '#reviews' },
      { name: 'Aloqa', href: '#contact' },
    ],
    brandName: 'Aisha Uzbikiyya',
    brandSub: 'الأَكاديمِيَّةُ الأُوزْبَكِيَّة',
    heroArabicBanner: 'الأَكاديمِيَّةُ الأُوزْبَكِيَّة لِتَعْليمِ اللُّغَةِ العَرَبِيَّةِ',
    heroEyebrow: 'Arab tili akademiyasi',
    heroTitlePrefix: 'Biz sizga ',
    heroTitleHighlight: 'arab tilini',
    heroArabicWord: '« اللُّغَةُ العَرَبِيَّةُ »',
    heroTitleSuffix: "professional darajada o‘rgatamiz",
    heroDesc: "Aisha Uzbikiyya — o‘qitishning izchil, zamonaviy va amaliy tizimi bilan ishlaydigan akademiya. Kichik guruhlar, individual mashg‘ulotlar va amaliy nutq mashqlari uyg‘unlikda olib boriladi. Arab tilini C1–C2 darajasiga olib chiqadigan ustoz bilan ishlaysiz.",
    enrollBtn: 'Kursga yoziling',
    telegramBtn: "Telegram bilan bog‘lanish",
    heroCards: {
      topLabel: 'Darslar',
      topVal: '4 bosqich',
    },
    about: {
      eyebrow: 'Biz haqimizda',
      title: "Til o‘rganishni aniq, qulay va samarali qilishga e‘tibor qaratamiz",
      card1Title: 'Bizning yondashuv',
      card1Desc: 'Har bir o‘quvchi bilan individual ishlanadi. Yordamchi ustoz mavjud, darsga kira olmasangiz yoki tushunmay qolsangiz, ularga murojat qilasiz. Darslar haftada 3 kun, jonli efirda olib boriladi.',
      card2Title: 'Qanday natija',
      card2Desc: 'Oylik to‘lov 12 ta darsni o‘z ichiga oladi. Kurslar natijaga sizib borishni xohlaganlar uchun tizimlashtirilgan bo‘lib, 40 ga yaqin o‘quvchida sertifikat olingan.',
    },
    courses: {
      eyebrow: 'Darslar',
      title: "O‘quv dasturlarimiz va kurslarimiz",
      btn: 'Batafsil',
      items: [
        {
          title: 'A1 Darajasi',
          arabicSubtitle: '« المُسْتَوى التَّمْهيدِيُّ A1 »',
          subtitle: "Alifbo, to‘g‘ri tovushlar va maxrajlar, o‘qish-yozish qoidalari hamda boshlang‘ich asosiy so‘z boyligi. Dastlabki bir oyda 150+ so‘z yodlaysiz, grammatik qoidalar bilan.",
          tag: "A1 Boshlang‘ich",
          tone: 'navy',
        },
        {
          title: 'A2 Darajasi',
          arabicSubtitle: '« المُسْتَوى الأَسَاسِيُّ A2 »',
          subtitle: 'Sodda gap tuzilmalari, kundalik muloqot, asosiy grammatika va mustaqil matnlarni tushunish ko‘nikmalari.',
          tag: 'A2 Elementar',
          tone: 'slate',
        },
        {
          title: 'B1 – B2 Darajasi',
          arabicSubtitle: '« المُسْتَوى المُتَوَسِّطُ B1-B2 »',
          subtitle: 'Sarf, nahv, ravon nutq, akademik matnlar va amaliy suhbat ko‘nikmalari bilan ishlanadi.',
          tag: "B1-B2 O‘rta",
          tone: 'gold',
        },
        {
          title: 'CEFR va Attanat C2 Tayyorgarlik',
          arabicSubtitle: '« اِخْتِبَارَاتُ CEFR وَالتَّانَال C2 »',
          subtitle: ' 40 ga yaqin o‘quvchi sertifikat olgan.',
          tag: 'CEFR & Attanat C2',
          tone: 'gold',
        },
      ],
    },
    goals: {
      eyebrow: 'Real maqsadlar',
      title: "Arab tilini o‘rganib nimalarga erishasiz?",
      desc: "Arab tili dunyo bo‘ylab 300 milliondan ortiq insonlar uchun asosiy til. Islom madaniyati, ilmiy meros va xalqaro muloqot uchun asosiy vositadir.",
      items: [
        {
          icon: '🎓',
          title: "Arab tili o‘qituvchisi",
          desc: "Maktab, akademiya yoki xususiy darslar orqali arab tilini o‘rgatuvchi professional mutaxassis bo‘ling.",
        },
        {
          icon: '🌐',
          title: 'Tarjimon',
          desc: "Arab tilidan o‘zbek yoki rus tiliga og‘zaki va yozma tarjima qiluvchi xalqaro darajadagi tarjimon bo‘ling.",
        },
        {
          icon: '✈️',
          title: 'Xalqaro karyera',
          desc: "Diplomatiya, xalqaro tashkilotlar, savdo va turizm sohalarida arab tilini bilib keng imkoniyatlarga ega bo‘ling.",
        },
      ],
    },
    mentor: {
      eyebrow: 'Ustoz haqida',
      title: "Arab tili o‘qitishda tajriba va to‘g‘ri uslub muhim",
      name: 'Aisha Ahmad',
      role: "Arab zamonaviy tili o‘qituvchisi • Bookblogger",
      arabicName: 'عَائِشَة أَحْمَد',
      arabicRole: '« مُعَلِّمَةُ اللُّغَةِ العَرَبِيَّةِ المُعَاصِرَةِ وَمُدَوِّنَةُ كُتُبٍ »',
      desc: "Arab zamonaviy tili (Fusha) o‘qituvchisi hamda bookblogger. O‘quvchilarga arab tilini zamonaviy interaktiv metodika, boy kitoblar mutolaasi va chuqur muhabbat bilan o‘rgatadi.",
      videosLabel: 'Ustozdan lavhalar',
      videosNote: "Ustozimizning Telegram kanalidan lavhalar",
      telegramChannelBtn: "Telegram kanalga o‘tish",
    },
    resultsSection: {
      eyebrow: 'Muvaffaqiyatlar',
      title: "O'quvchilarimiz natijalari va yutuqlari",
      desc: "Akademiyamizda tahsil olgan talabalarimizning qo'lga kiritgan sertifikatlari va imtihon natijalari.",
      empty: "Tez kunda yangi natijalar e'lon qilinadi.",
    },
    reviewsSection: {
      eyebrow: 'Fikrlar va sharhlar',
      title: "O'quvchilarimiz akademiyamiz haqida",
      desc: "Darslarimizda ishtirok etgan o'quvchilarning samimiy taassurotlari.",
      empty: "Sharhlar tez orada qo'shiladi.",
    },
    gradesSection: {
      eyebrow: 'Reyting tizimi',
      title: "Guruh o'quvchilari reytingi",
      desc: "Guruh ID kodini kiritib, darsdagi ballar va natijalarni tekshiring.",
      inputPlaceholder: "Guruh ID sini kiriting (masalan: 1)",
      checkBtn: "Reytingni ko'rish",
      notFound: "Ushbu guruh topilmadi yoki hali o'quvchilar baholanmagan.",
    },
    contact: {
      eyebrow: 'Telegram admin',
      title: 'Ma‘lumotlarni bot orqali olasiz',
      desc: 'Guruhlar haqida batafsil ma‘lumot Telegram bot orqali beriladi. Dars jadvali va imkoniyatlar haqida bir zumda xabar olasiz.',
      btn: 'Telegram botga o‘tish',
    },
    footer: '© 2026 Aisha Uzbikiyya. Barcha huquqlar himoyalangan.',
  },
  EN: {
    nav: [
      { name: 'About Us', href: '#about' },
      { name: 'Courses', href: '#courses' },
      { name: 'Goals', href: '#goals' },
      { name: 'Mentor', href: '#mentor' },
      { name: 'Results', href: '#results' },
      { name: 'Reviews', href: '#reviews' },
      { name: 'Contact', href: '#contact' },
    ],
    brandName: 'Aisha Uzbikiyya',
    brandSub: 'الأَكاديمِيَّةُ الأُوزْبَكِيَّة',
    heroArabicBanner: 'الأَكاديمِيَّةُ الأُوزْبَكِيَّة لِتَعْليمِ اللُّغَةِ العَرَبِيَّةِ',
    heroEyebrow: 'Arabic Language Academy',
    heroTitlePrefix: 'We teach you ',
    heroTitleHighlight: 'Arabic',
    heroArabicWord: '« اللُّغَةُ العَرَبِيَّةُ »',
    heroTitleSuffix: 'at a professional level',
    heroDesc: 'Aisha Uzbikiyya is an academy built upon a structured, modern, and highly practical teaching methodology. Small interactive groups, personalized tutoring, and live conversational practice.',
    enrollBtn: 'Enroll Now',
    telegramBtn: 'Contact via Telegram',
    heroCards: {
      topLabel: 'Program',
      topVal: '4 Levels',
    },
    about: {
      eyebrow: 'About Us',
      title: 'Dedicated to making Arabic learning clear, accessible, and enjoyable',
      card1Title: 'Our Methodology',
      card1Desc: 'Classes are structured around real-life immersion. Every grammar rule is immediately reinforced with interactive pronunciation and conversational drills.',
      card2Title: 'Expected Outcome',
      card2Desc: 'Students build strong foundational fluency in reading, accurate phonetics, writing, and natural speaking confidence.',
    },
    courses: {
      eyebrow: 'Courses',
      title: 'Our Comprehensive Course Offerings',
      btn: 'Details',
      items: [
        {
          title: 'A1 Level',
          arabicSubtitle: '« المُسْتَوى التَّمْهيدِيُّ A1 »',
          subtitle: 'Alphabet, correct phonetics and articulation, reading fundamentals, and everyday core vocabulary.',
          tag: 'A1 Beginner',
          tone: 'navy',
        },
        {
          title: 'A2 Level',
          arabicSubtitle: '« المُسْتَوى الأَسَاسِيُّ A2 »',
          subtitle: 'Sentence building, foundational grammar patterns, daily conversation, and reading comprehension.',
          tag: 'A2 Elementary',
          tone: 'slate',
        },
        {
          title: 'B1 – B2 Level',
          arabicSubtitle: '« المُسْتَوى المُتَوَسِّطُ B1-B2 »',
          subtitle: 'Advanced morphology (sarf), syntax (nahw), fluent communicative practice, and authentic text analysis.',
          tag: 'B1-B2 Intermediate',
          tone: 'gold',
        },
        {
          title: 'CEFR & Attanat C2 Prep',
          arabicSubtitle: '« اِخْتِبَارَاتُ CEFR وَالتَّانَال C2 »',
          subtitle: 'Targeted preparation for National CEFR and International Attanat C2 proficiency credentials. Earn your certificate from zero.',
          tag: 'CEFR & Attanat C2',
          tone: 'gold',
        },
      ],
    },
    goals: {
      eyebrow: 'Real Goals',
      title: 'What can you achieve by learning Arabic?',
      desc: 'Spoken by more than 300 million people worldwide. Arabic is the key to Islamic heritage, science and international communication.',
      items: [
        { icon: '🎓', title: 'Arabic Language Teacher', desc: 'Become a professional Arabic educator teaching in schools, academies, or private lessons.' },
        { icon: '🌐', title: 'Translator / Interpreter', desc: 'Work as a professional translator from Arabic to English or other languages at an international level.' },
        { icon: '✈️', title: 'International Career', desc: 'Open doors to diplomacy, international organizations, trade, and travel with Arabic fluency.' },
      ],
    },
    mentor: {
      eyebrow: 'Your Instructor',
      title: 'Years of Dedicated Guidance in Classical Arabic',
      name: 'Aisha Ahmad',
      role: 'Modern Standard Arabic Teacher • Bookblogger',
      arabicName: 'عَائِشَة أَحْمَد',
      arabicRole: '« مُعَلِّمَةُ اللُّغَةِ العَرَبِيَّةِ المُعَاصِرَةِ وَمُدَوِّنَةُ كُتُبٍ »',
      desc: 'Modern Standard Arabic educator and bookblogger. Inspiring students through modern communicative methodologies and a genuine love for reading.',
      videosLabel: 'From the Instructor',
      videosNote: "Clips from the instructor's Telegram channel",
      telegramChannelBtn: 'Visit Telegram Channel',
    },
    resultsSection: {
      eyebrow: 'Showcase',
      title: 'Student Achievements & Certificates',
      desc: 'Real credentials and CEFR milestones earned by our academy learners.',
      empty: 'New results will be posted soon.',
    },
    reviewsSection: {
      eyebrow: 'Testimonials',
      title: 'What Our Students Say',
      desc: 'Genuine feedback from our participants.',
      empty: 'Reviews will appear soon.',
    },
    gradesSection: {
      eyebrow: 'Leaderboard',
      title: 'Student Performance & Grades',
      desc: 'Enter your Group ID to inspect rankings and scores.',
      inputPlaceholder: 'Enter Group ID (e.g. 1)',
      checkBtn: 'Check Leaderboard',
      notFound: 'Group not found or no students rated yet.',
    },
    contact: {
      eyebrow: 'Telegram Admin',
      title: 'You can receive information through the bot',
      desc: 'Detailed information about groups and schedules is shared through the Telegram bot. You will get the latest details quickly and clearly.',
      btn: 'Open Telegram Bot',
    },
    footer: '© 2026 Aisha Uzbikiyya Academy. All rights reserved.',
  },
  RU: {
    nav: [
      { name: 'О нас', href: '#about' },
      { name: 'Курсы', href: '#courses' },
      { name: 'Цели', href: '#goals' },
      { name: 'Преподаватель', href: '#mentor' },
      { name: 'Результаты', href: '#results' },
      { name: 'Отзывы', href: '#reviews' },
      { name: 'Контакты', href: '#contact' },
    ],
    brandName: 'Aisha Uzbikiyya',
    brandSub: 'الأَكاديمِيَّةُ الأُوزْبَكِيَّة',
    heroArabicBanner: 'الأَكاديمِيَّةُ الأُوزْبَكِيَّة لِتَعْليمِ اللُّغَةِ العَرَبِيَّةِ',
    heroEyebrow: 'Академия арабского языка',
    heroTitlePrefix: 'Обучаем вас ',
    heroTitleHighlight: 'арабскому языку',
    heroArabicWord: '« اللُّغَةُ العَرَبِيَّةُ »',
    heroTitleSuffix: 'на профессиональном уровне',
    heroDesc: 'Aisha Uzbikiyya — академия с последовательной, современной и практической методикой обучения. Занятия в малых группах, индивидуальный подход и постоянная речевая практика.',
    enrollBtn: 'Записаться на курс',
    telegramBtn: 'Связаться через Telegram',
    heroCards: {
      topLabel: 'Программа',
      topVal: '4 уровня',
    },
    about: {
      eyebrow: 'О нас',
      title: 'Делаем изучение арабского языка понятным, доступным и результативным',
      card1Title: 'Наш подход',
      card1Desc: 'Обучение строится на живой практике. Каждая грамматическая тема подкрепляется постановкой речи и диалогами.',
      card2Title: 'Результат',
      card2Desc: 'Студенты обретают уверенность в чтении, правильном произношении, письме и свободном общении.',
    },
    courses: {
      eyebrow: 'Курсы',
      title: 'Наши учебные программы',
      btn: 'Подробнее',
      items: [
        { title: 'Уровень A1', arabicSubtitle: '« المُسْتَوى التَّمْهيدِيُّ A1 »', subtitle: 'Алфавит, постановка махраджа, правила чтения и базовый словарь.', tag: 'A1 Начальный', tone: 'navy' },
        { title: 'Уровень A2', arabicSubtitle: '« المُسْتَوى الأَسَاسِيُّ A2 »', subtitle: 'Базовая грамматика, бытовые диалоги и чтение текстов.', tag: 'A2 Элементарный', tone: 'slate' },
        { title: 'Уровень B1 – B2', arabicSubtitle: '« المُسْتَوى المُتَوَسِّطُ B1-B2 »', subtitle: 'Грамматика (сарф и нахву), разговорная речь и чтение литературы.', tag: 'B1-B2 Средний', tone: 'gold' },
        { title: 'Подготовка CEFR и Attanat C2', arabicSubtitle: '« اِخْتِبَارَاتُ CEFR وَالتَّانَال C2 »', subtitle: 'Интенсивная подготовка к CEFR и Attanat C2. Возможность получить сертификат с нуля.', tag: 'CEFR & Attanat C2', tone: 'gold' },
      ],
    },
    goals: {
      eyebrow: 'Реальные цели',
      title: 'Чего вы достигнете, изучив арабский?',
      desc: 'Один из ведущих мировых языков — более 300 млн носителей.',
      items: [
        { icon: '🎓', title: 'Преподаватель арабского', desc: 'Профессиональный педагог в школах или частной практике.' },
        { icon: '🌐', title: 'Переводчик / Синхронист', desc: 'Профессиональный переводчик на международном уровне.' },
        { icon: '✈️', title: 'Международная карьера', desc: 'Дипломатия, организации, бизнес и туризм.' },
      ],
    },
    mentor: {
      eyebrow: 'О преподавателе',
      title: 'Опыт и правильная методика — основа успеха',
      name: 'Aisha Ahmad',
      role: 'Преподаватель арабского языка • Букблогер',
      arabicName: 'عَائِشَة أَحْمَد',
      arabicRole: '« مُعَلِّمَةُ اللُّغَةِ العَرَبِيَّةِ المُعَاصِرَةِ وَمُدَوِّنَةُ كُتُبٍ »',
      desc: 'Преподаватель современного арабского языка и книжный блогер.',
      videosLabel: 'От преподавателя',
      videosNote: 'Видео из Telegram-канала преподавателя',
      telegramChannelBtn: 'Перейти в Telegram-канал',
    },
    resultsSection: {
      eyebrow: 'Достижения',
      title: 'Результаты и сертификаты студентов',
      desc: 'Сертификаты CEFR и успехи наших учеников.',
      empty: 'Результаты будут опубликованы в ближайшее время.',
    },
    reviewsSection: {
      eyebrow: 'Отзывы',
      title: 'Что говорят наши ученики',
      desc: 'Искренние отзывы участников наших курсов.',
      empty: 'Отзывы скоро появятся.',
    },
    gradesSection: {
      eyebrow: 'Рейтинг',
      title: 'Рейтинг успеваемости групп',
      desc: 'Введите номер группы, чтобы проверить баллы.',
      inputPlaceholder: 'Введите ID группы (например: 1)',
      checkBtn: 'Посмотреть рейтинг',
      notFound: 'Группа не найдена или баллы еще не выставлены.',
    },
    contact: {
      eyebrow: 'Telegram администратор',
      title: 'Информацию вы получите через бота',
      desc: 'Подробности о группах и расписании отправляются через Telegram-бота. Вы быстро получите актуальные данные.',
      btn: 'Перейти в Telegram-бот',
    },
    footer: '© 2026 Aisha Uzbikiyya Academy. Все права защищены.',
  },
};

const languageOptions = ['UZ', 'EN', 'RU'];

const TELEGRAM_CHANNEL_URL = 'https://t.me/aisha_uzbikiyya';
const TELEGRAM_BOT_URL = 'https://t.me/aishauzbikiyya_bot';
const INSTAGRAM_URL = 'https://instagram.com/aisha_uzbikiyya';

const mentorVideos = [
  { videoUrl: 'https://t.me/aisha_uzbikiyya/265', id: 1 },
  { videoUrl: 'https://t.me/aisha_uzbikiyya/135', id: 2 },
  { videoUrl: 'https://t.me/aisha_uzbikiyya/185', id: 3 },
];

function Landing() {
  const [lang, setLang] = useState('UZ');
  const t = content[lang] || content.UZ;

  // Dinamik ma'lumotlar
  const [resultsList, setResultsList] = useState([]);
  const [reviewsList, setReviewsList] = useState([]);

  // Leaderboard qidiruvi
  const [groupIdInput, setGroupIdInput] = useState('');
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Natijalar va sharhlarni serverdan yuklash
  useEffect(() => {
    // Natijalar
    fetch(`${API}/api/results`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.results) setResultsList(data.results);
      })
      .catch(() => {});

    // Sharhlar
    fetch(`${API}/api/reviews`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.reviews) setReviewsList(data.reviews);
      })
      .catch(() => {});
  }, []);

  const handleLookupLeaderboard = async (e) => {
    e.preventDefault();
    if (!groupIdInput.trim()) return;
    setLeaderboardLoading(true);
    setLeaderboardError('');
    setLeaderboardData(null);

    try {
      const res = await fetch(`${API}/api/leaderboard/${encodeURIComponent(groupIdInput.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.gradesSection.notFound);
      if (!data.leaderboard || data.leaderboard.length === 0) {
        setLeaderboardError(t.gradesSection.notFound);
      } else {
        setLeaderboardData(data.leaderboard);
      }
    } catch (err) {
      setLeaderboardError(err.message || t.gradesSection.notFound);
    }
    setLeaderboardLoading(false);
  };

  const videoLabel = (num) => {
    if (lang === 'UZ') return 'Video ' + num;
    if (lang === 'RU') return 'Видео ' + num;
    return 'Video ' + num;
  };

  const comingSoon = lang === 'UZ' ? 'Tez orada' : lang === 'RU' ? 'Скоро' : 'Coming soon';

  return (
    <div className="site-wrapper">
      {/* Full-width sticky navigatsiya */}
      <header className="topbar-wrapper">
        <div className="container topbar-container">
          <a href="/" className="brand-wrap" aria-label="Aisha Uzbikiyya logo">
            <div className="brand-logo-frame">
              <img
                src="/logo.jpg"
                alt="Uzbikiyya Akademiyasi"
                className="brand-logo-img"
              />
            </div>
            <div className="brand-text">
              <span className="brand-name">{t.brandName}</span>
              <span className="brand-sub">{t.brandSub}</span>
            </div>
          </a>

          <nav className="main-nav" aria-label="Asosiy navigatsiya">
            {t.nav.map((item) => (
              <a href={item.href} key={item.name} className="nav-link">
                {item.name}
              </a>
            ))}
          </nav>

          <div className="lang-switcher" aria-label="Til tanlash">
            {languageOptions.map((code) => (
              <button
                key={code}
                type="button"
                className={'lang-btn' + (lang === code ? ' active' : '')}
                onClick={() => setLang(code)}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Asosiy kontent */}
      <main className="main-content">
        {/* Hero bo'limi */}
        <section className="hero-section">
          <div className="container hero-container">
            <div className="hero-copy">
              <div className="hero-arabic-banner">
                <span className="banner-icon">✦</span>
                <span className="academy-arabic">{t.heroArabicBanner}</span>
                <span className="banner-icon">✦</span>
              </div>

              <div className="eyebrow-wrap">
                <span className="eyebrow">{t.heroEyebrow}</span>
              </div>

              <h1 className="hero-main-title">
                {t.heroTitlePrefix}
                <span className="hero-highlight-group">
                  <span className="highlight">{t.heroTitleHighlight}</span>
                  <span className="hero-big-arabic">{t.heroArabicWord}</span>
                </span>
                <br />
                {t.heroTitleSuffix}
              </h1>

              <p className="hero-desc">{t.heroDesc}</p>

              <div className="hero-actions">
                <a href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer" className="btn-primary">
                  {t.enrollBtn} →
                </a>
                <a href={TELEGRAM_CHANNEL_URL} target="_blank" rel="noreferrer" className="btn-secondary">
                  {t.telegramBtn}
                </a>
              </div>
            </div>

            <div className="hero-panel">
              <div className="mini-card card-top">
                <div className="card-labels">
                  <span className="label">{t.heroCards.topLabel}</span>
                </div>
                <strong>{t.heroCards.topVal}</strong>
              </div>

              <div className="hero-block">
                <div className="stat-box">
                  <span className="small-label">Oylik</span>
                  <strong>12 ta dars</strong>
                </div>
                <div className="stat-box accent">
                  <span className="small-label">Jonli dars</span>
                  <strong>3 kun / hafta</strong>
                </div>
              </div>

              <div className="mini-card card-bottom">
                <div className="card-labels">
                  <span className="label">Sertifikat</span>
                </div>
                <strong>40+ o'quvchi</strong>
              </div>
            </div>
          </div>
        </section>

        {/* Biz haqimizda bo'limi */}
        <section className="about-section" id="about">
          <div className="container">
            <div className="section-header">
              <div className="section-title-wrap">
                <span className="eyebrow eyebrow-dark">{t.about.eyebrow}</span>
              </div>
              <h2>{t.about.title}</h2>
            </div>
            <div className="about-grid">
              <div className="info-card">
                <h3>{t.about.card1Title}</h3>
                <p>{t.about.card1Desc}</p>
              </div>
              <div className="info-card">
                <h3>{t.about.card2Title}</h3>
                <p>{t.about.card2Desc}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Darslar bo'limi */}
        <section className="courses-section" id="courses">
          <div className="container">
            <div className="section-header">
              <div className="section-title-wrap">
                <span className="eyebrow eyebrow-dark">{t.courses.eyebrow}</span>
              </div>
              <h2>{t.courses.title}</h2>
            </div>
            <div className="course-grid">
              {t.courses.items.map((course) => (
                <article className={'course-card ' + course.tone} key={course.title}>
                  <div className="course-header">
                    <span className="course-tag">{course.tag}</span>
                    <span className="course-arabic-tag">{course.arabicSubtitle}</span>
                  </div>
                  <h3>{course.title}</h3>
                  <p>{course.subtitle}</p>
                  <a href={TELEGRAM_CHANNEL_URL} target="_blank" rel="noreferrer" className="course-btn">
                    {t.courses.btn} →
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Maqsadlar bo'limi */}
        <section className="goals-section" id="goals">
          <div className="container">
            <div className="section-header">
              <div className="section-title-wrap">
                <span className="eyebrow eyebrow-dark">{t.goals.eyebrow}</span>
              </div>
              <h2>{t.goals.title}</h2>
              <p className="goals-desc">{t.goals.desc}</p>
            </div>
            <div className="goals-grid">
              {t.goals.items.map((goal, index) => (
                <div className="goal-card" key={index}>
                  <div className="goal-icon">{goal.icon}</div>
                  <h3>{goal.title}</h3>
                  <p>{goal.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ustoz haqida bo'limi */}
        <section className="mentor-section" id="mentor">
          <div className="container">
            <div className="section-header">
              <div className="section-title-wrap">
                <span className="eyebrow eyebrow-dark">{t.mentor.eyebrow}</span>
              </div>
              <h2>{t.mentor.title}</h2>
            </div>

            <div className="mentor-layout">
              <div className="mentor-profile">
                <div className="mentor-avatar-wrap">
                  <div className="mentor-avatar">ع</div>
                </div>
                <div className="mentor-info">
                  <div className="mentor-badges">
                    <span className="mentor-role-badge">{t.mentor.role}</span>
                    <span className="mentor-arabic-title">{t.mentor.arabicName}</span>
                  </div>
                  <h3>{t.mentor.name}</h3>
                  <span className="mentor-arabic-role">{t.mentor.arabicRole}</span>
                  <p>{t.mentor.desc}</p>
                </div>
              </div>

              {/* Telegram lavhalar bo'limi */}
              <div className="video-section">
                <div className="video-section-header">
                  <h3>{t.mentor.videosLabel}</h3>
                  <p className="video-section-note">{t.mentor.videosNote}</p>
                </div>

                <div className="video-gallery-grid">
                  {mentorVideos.map((video) => (
                    <div className="video-card" key={video.id}>
                      {video.videoUrl ? (
                        <a href={video.videoUrl} target="_blank" rel="noreferrer" className="video-link">
                          <div className="video-thumbnail active">
                            <div className="play-btn">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                          <span className="video-title">{videoLabel(video.id)}</span>
                        </a>
                      ) : (
                        <div className="video-placeholder-card">
                          <div className="video-thumbnail">
                            <div className="play-btn disabled">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                          <div className="video-meta">
                            <span className="video-title">{videoLabel(video.id)}</span>
                            <span className="video-coming-soon">{comingSoon}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
                  <a
                    href={TELEGRAM_CHANNEL_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="tg-channel-btn"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.03 9.57c-.148.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.893.651z" />
                    </svg>
                    {t.mentor.telegramChannelBtn}
                  </a>
                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="tg-channel-btn"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5zm5.25-3.25a1.25 1.25 0 1 1-1.25 1.25 1.25 1.25 0 0 1 1.25-1.25z"/>
                    </svg>
                    Instagram
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Natijalar bo'limi (Admin kiritgan natijalar) */}
        <section className="results-section" id="results">
          <div className="container">
            <div className="section-header">
              <div className="section-title-wrap">
                <span className="eyebrow eyebrow-dark">{t.resultsSection.eyebrow}</span>
              </div>
              <h2>{t.resultsSection.title}</h2>
              <p className="goals-desc">{t.resultsSection.desc}</p>
            </div>

            {resultsList.length === 0 ? (
              <div className="admin-empty-state" style={{ background: '#fff', borderRadius: '16px', padding: '36px' }}>
                <span className="empty-icon">🏆</span>
                <p>{t.resultsSection.empty}</p>
              </div>
            ) : (
              <div className="results-gallery">
                {resultsList.map((item) => (
                  <div className="result-card" key={item.id}>
                    <img
                      src={`${API}/uploads/${item.filename}`}
                      alt={item.caption || "O'quvchi natijasi"}
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = '/logo.jpg';
                      }}
                    />
                    {item.caption && <div className="result-caption">{item.caption}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Sharhlar bo'limi (Admin kiritgan sharhlar) */}
        <section className="reviews-section" id="reviews">
          <div className="container">
            <div className="section-header">
              <div className="section-title-wrap">
                <span className="eyebrow eyebrow-dark">{t.reviewsSection.eyebrow}</span>
              </div>
              <h2>{t.reviewsSection.title}</h2>
              <p className="goals-desc">{t.reviewsSection.desc}</p>
            </div>

            {reviewsList.length === 0 ? (
              <div className="admin-empty-state" style={{ background: '#fff', borderRadius: '16px', padding: '36px' }}>
                <span className="empty-icon">💬</span>
                <p>{t.reviewsSection.empty}</p>
              </div>
            ) : (
              <div className="reviews-grid">
                {reviewsList.map((rev) => (
                  <div className="review-card" key={rev.id}>
                    <div className="review-stars">
                      {'★'.repeat(rev.stars || 5)}
                      {'☆'.repeat(5 - (rev.stars || 5))}
                    </div>
                    <p className="review-text">"{rev.text}"</p>
                    <div className="review-author">
                      <div className="review-avatar">
                        {(rev.name || 'A').charAt(0).toUpperCase()}
                      </div>
                      <span>{rev.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Guruh reytingini tekshirish bo'limi */}
        <section className="grades-section" id="leaderboard">
          <div className="container">
            <div className="section-header">
              <div className="section-title-wrap">
                <span className="eyebrow eyebrow-dark">{t.gradesSection.eyebrow}</span>
              </div>
              <h2>{t.gradesSection.title}</h2>
              <p className="goals-desc">{t.gradesSection.desc}</p>
            </div>

            <form onSubmit={handleLookupLeaderboard} className="grades-lookup-form">
              <input
                type="number"
                placeholder={t.gradesSection.inputPlaceholder}
                value={groupIdInput}
                onChange={(e) => setGroupIdInput(e.target.value)}
                className="grades-input"
                min="1"
                required
              />
              <button type="submit" className="btn-primary" disabled={leaderboardLoading}>
                {leaderboardLoading ? 'Tekshirilmoqda...' : t.gradesSection.checkBtn}
              </button>
            </form>

            {leaderboardError && (
              <div className="grades-error">
                <span>⚠️ {leaderboardError}</span>
              </div>
            )}

            {leaderboardData && leaderboardData.length > 0 && (
              <div className="grades-table-wrap">
                <table className="grades-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>#</th>
                      <th>O'quvchi</th>
                      <th style={{ textAlign: 'right' }}>Oylik ball</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.map((st, idx) => (
                      <tr key={st.telegram_id || idx} className={idx < 3 ? 'top-row' : ''}>
                        <td className="rank-cell">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </td>
                        <td>
                          <strong>{st.full_name}</strong>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="points-badge pub">{st.current_month_points || 0}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Bog'lanish bo'limi */}
        <section className="contact-section" id="contact">
          <div className="container">
            <div className="contact-card">
              <div>
                <div className="section-title-wrap">
                  <span className="eyebrow eyebrow-dark">{t.contact.eyebrow}</span>
                </div>
                <h2>{t.contact.title}</h2>
                <p className="contact-copy">{t.contact.desc}</p>
                <div style={{ marginTop: '18px', display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
                  <a href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer" className="telegram-btn">
                    {t.contact.btn} ✦
                  </a>
                  <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="secondary-link">
                    Instagram sahifa
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer (Admin tizimiga o'tish linki bilan) */}
      <footer className="site-footer">
        <div className="container footer-container">
          <div className="footer-left">
            <span>{t.footer}</span>
            <span className="footer-arabic-motto">
              الأَكاديمِيَّةُ الأُوزْبَكِيَّة — بِإِتْقَانٍ وَاحْتِرَافِيَّةٍ
            </span>
          </div>

          <div className="footer-right">
            <a href="/admin" className="subtle-admin-link" title="Boshqaruv">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ opacity: 0.75 }}>
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
              <span>Kirish</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
