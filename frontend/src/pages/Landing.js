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
      { name: 'Aloqa', href: '#contact' },
    ],
    brandName: 'Aisha Uzbikiyya',
    brandSub: '\u0627\u0644\u0623\u064E\u0643\u064E\u0627\u062F\u064A\u0645\u064A\u0651\u064E\u0629\u064F \u0627\u0644\u0623\u064F\u0648\u0632\u0652\u0628\u064E\u0643\u064A\u0651\u064E\u0629',
    heroArabicBanner: '\u0627\u0644\u0623\u064E\u0643\u064E\u0627\u062F\u064A\u0645\u064A\u0651\u064E\u0629\u064F \u0627\u0644\u0623\u064F\u0648\u0632\u0652\u0628\u064E\u0643\u064A\u0651\u064E\u0629 \u0644\u0650\u062A\u064E\u0639\u0652\u0644\u064A\u0645\u0650 \u0627\u0644\u0644\u0651\u064F\u063A\u064E\u0629\u0650 \u0627\u0644\u0639\u064E\u0631\u064E\u0628\u064A\u0651\u064E\u0629\u0650',
    heroEyebrow: 'Arab tili akademiyasi',
    heroTitlePrefix: 'Biz sizga ',
    heroTitleHighlight: 'arab tilini',
    heroArabicWord: '\u00AB \u0627\u0644\u0644\u0651\u064F\u063A\u064E\u0629\u064F \u0627\u0644\u0639\u064E\u0631\u064E\u0628\u064A\u0651\u064E\u0629\u064F \u00BB',
    heroTitleSuffix: "professional darajada o\u2018rgatamiz",
    heroDesc: "Aisha Uzbikiyya \u2014 o\u2018qitishning izchil, zamonaviy va amaliy tizimi bilan ishlaydigan akademiya. Kichik guruhlar, individual mashg\u2018ulotlar va amaliy nutq mashqlari uyg\u2018unlikda olib boriladi.",
    enrollBtn: 'Kursga yoziling',
    telegramBtn: "Telegram bilan bog\u2018lanish",
    heroCards: {
      topLabel: 'Darslar',
      topVal: '4 bosqich',
    },
    about: {
      eyebrow: 'Biz haqimizda',
      title: "Til o\u2018rganishni aniq, qulay va samarali qilishga e\u2018tibor qaratamiz",
      card1Title: 'Bizning yondashuv',
      card1Desc: 'Darslar tezkor, maqsadli va real hayotga mos tarzda tashkil etiladi. Har bir mavzu tushuntirish, amaliy mashq va jonli nutq mashqlari bilan birga olib boriladi.',
      card2Title: 'Qanday natija',
      card2Desc: "Talabalar tushunish va suhbat ko\u2018nikmalarini bosqichma-bosqich rivojlantiradi. Darsdan keyin mustahkamlash va amaliy foydalanish ta\u2018minlanadi.",
    },
    courses: {
      eyebrow: 'Darslar',
      title: "O\u2018quv dasturlarimiz va kurslarimiz",
      btn: 'Batafsil',
      items: [
        {
          title: 'A1 Darajasi',
          arabicSubtitle: '\u00AB \u0627\u0644\u0645\u064F\u0633\u0652\u062A\u064E\u0648\u0649 \u0627\u0644\u062A\u0651\u064E\u0645\u0652\u0647\u064A\u062F\u0650\u064A\u0651\u064F A1 \u00BB',
          subtitle: "Alifbo, to\u2018g\u2018ri tovushlar va maxrajlar, o\u2018qish-yozish qoidalari hamda boshlang\u2018ich asosiy so\u2018z boyligi.",
          tag: "A1 Boshlang\u2018ich",
          tone: 'navy',
        },
        {
          title: 'A2 Darajasi',
          arabicSubtitle: '\u00AB \u0627\u0644\u0645\u064F\u0633\u0652\u062A\u064E\u0648\u0649 \u0627\u0644\u0623\u064E\u0633\u064E\u0627\u0633\u0650\u064A\u0651\u064F A2 \u00BB',
          subtitle: 'Sodda gap tuzilmalari, asosiy grammatika, kundalik turmush muloqoti va mustaqil matnlarni tushunish.',
          tag: 'A2 Elementar',
          tone: 'slate',
        },
        {
          title: 'B1 \u2013 B2 Darajasi',
          arabicSubtitle: '\u00AB \u0627\u0644\u0645\u064F\u0633\u0652\u062A\u064E\u0648\u0649 \u0627\u0644\u0645\u064F\u062A\u064E\u0648\u064E\u0633\u0651\u0650\u0637\u064F B1-B2 \u00BB',
          subtitle: 'Arab tili morfologiyasi (sarf) va sintaksisi (nahv), ravon jonli nutq va boy adabiyotlar tahlili.',
          tag: "B1-B2 O\u2018rta",
          tone: 'gold',
        },
        {
          title: 'CEFR va Attanat C2 Tayyorgarlik',
          arabicSubtitle: '\u00AB \u0627\u0650\u062E\u0652\u062A\u0650\u0628\u064E\u0627\u0631\u064E\u0627\u062A\u064F CEFR \u0648\u064E\u0627\u0644\u062A\u0651\u064E\u0627\u0646\u064E\u0627\u0644 C2 \u00BB',
          subtitle: 'Davlat CEFR sertifikati va xalqaro Attanat C2 imtihonlariga ixtisoslashgan intensiv tayyorgarlik. Sefr va Attanat olish imkoni.',
          tag: 'CEFR & Attanat C2',
          tone: 'gold',
        },
      ],
    },
    goals: {
      eyebrow: 'Real maqsadlar',
      title: "Arab tilini o\u2018rganib nimalarga erishasiz?",
      desc: "Arab tili dunyo bo\u2018ylab 300 milliondan ortiq insonlar uchun asosiy til. Islom madaniyati, ilmiy meros va xalqaro muloqot uchun asosiy vositadir.",
      items: [
        {
          icon: '\uD83C\uDF93',
          title: "Arab tili o\u2018qituvchisi",
          desc: "Maktab, akademiya yoki xususiy darslar orqali arab tilini o\u2018rgatuvchi professional mutaxassis bo\u2018ling.",
        },
        {
          icon: '\uD83C\uDF10',
          title: 'Tarjimon',
          desc: "Arab tilidan o\u2018zbek yoki rus tiliga og\u2018zaki va yozma tarjima qiluvchi xalqaro darajadagi tarjimon bo\u2018ling.",
        },

        {
          icon: '\u2708\uFE0F',
          title: 'Xalqaro karyera',
          desc: "Diplomatiya, xalqaro tashkilotlar, savdo va turizm sohalarida arab tilini bilib keng imkoniyatlarga ega bo\u2018ling.",
        },
      ],
    },
    mentor: {
      eyebrow: 'Ustoz haqida',
      title: "Arab tili o\u2018qitishda tajriba va to\u2018g\u2018ri uslub muhim",
      name: 'Aisha Ahmad',
      role: "Arab zamonaviy tili o\u2018qituvchisi \u2022 Bookblogger",
      arabicName: '\u0639\u064E\u0627\u0626\u0650\u0634\u064E\u0629 \u0623\u064E\u062D\u0652\u0645\u064E\u062F',
      arabicRole: '\u00AB \u0645\u064F\u0639\u064E\u0644\u0651\u0650\u0645\u064E\u0629\u064F \u0627\u0644\u0644\u0651\u064F\u063A\u064E\u0629\u0650 \u0627\u0644\u0639\u064E\u0631\u064E\u0628\u064A\u0651\u064E\u0629\u0650 \u0627\u0644\u0645\u064F\u0639\u064E\u0627\u0635\u0650\u0631\u064E\u0629\u0650 \u0648\u064E\u0645\u064F\u062F\u064E\u0648\u0651\u0650\u0646\u064E\u0629\u064F \u0643\u064F\u062A\u064F\u0628\u064D \u00BB',
      desc: "Arab zamonaviy tili (Fusha) o\u2018qituvchisi hamda bookblogger. O\u2018quvchilarga arab tilini zamonaviy interaktiv metodika, boy kitoblar mutolaasi va chuqur muhabbat bilan o\u2018rgatadi.",
      videosLabel: 'Ustozdan lavhalar',
      videosNote: "Ustozimizning Telegram kanalidan lavhalar",
      telegramChannelBtn: "Telegram kanalga o\u2018tish",
    },
    contact: {
      eyebrow: 'Telegram admin',
      title: "Yozing va o\u2018zingizga mos dars jadvalini tanlang",
      btn: "Telegram orqali bog\u2018lanish",
    },
    footer: '\u00A9 2026 Aisha Uzbikiyya. Barcha huquqlar himoyalangan.',
  },
  EN: {
    nav: [
      { name: 'About Us', href: '#about' },
      { name: 'Courses', href: '#courses' },
      { name: 'Goals', href: '#goals' },
      { name: 'Mentor', href: '#mentor' },
      { name: 'Contact', href: '#contact' },
    ],
    brandName: 'Aisha Uzbikiyya',
    brandSub: '\u0627\u0644\u0623\u064E\u0643\u064E\u0627\u062F\u064A\u0645\u064A\u0651\u064E\u0629\u064F \u0627\u0644\u0623\u064F\u0648\u0632\u0652\u0628\u064E\u0643\u064A\u0651\u064E\u0629',
    heroArabicBanner: '\u0627\u0644\u0623\u064E\u0643\u064E\u0627\u062F\u064A\u0645\u064A\u0651\u064E\u0629\u064F \u0627\u0644\u0623\u064F\u0648\u0632\u0652\u0628\u064E\u0643\u064A\u0651\u064E\u0629 \u0644\u0650\u062A\u064E\u0639\u0652\u0644\u064A\u0645\u0650 \u0627\u0644\u0644\u0651\u064F\u063A\u064E\u0629\u0650 \u0627\u0644\u0639\u064E\u0631\u064E\u0628\u064A\u0651\u064E\u0629\u0650',
    heroEyebrow: 'Arabic Language Academy',
    heroTitlePrefix: 'We teach you ',
    heroTitleHighlight: 'Arabic',
    heroArabicWord: '\u00AB \u0627\u0644\u0644\u0651\u064F\u063A\u064E\u0629\u064F \u0627\u0644\u0639\u064E\u0631\u064E\u0628\u064A\u0651\u064E\u0629\u064F \u00BB',
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
          arabicSubtitle: '\u00AB \u0627\u0644\u0645\u064F\u0633\u0652\u062A\u064E\u0648\u0649 \u0627\u0644\u062A\u0651\u064E\u0645\u0652\u0647\u064A\u062F\u0650\u064A\u0651\u064F A1 \u00BB',
          subtitle: 'Alphabet, correct phonetics and articulation, reading fundamentals, and everyday core vocabulary.',
          tag: 'A1 Beginner',
          tone: 'navy',
        },
        {
          title: 'A2 Level',
          arabicSubtitle: '\u00AB \u0627\u0644\u0645\u064F\u0633\u0652\u062A\u064E\u0648\u0649 \u0627\u0644\u0623\u064E\u0633\u064E\u0627\u0633\u0650\u064A\u0651\u064F A2 \u00BB',
          subtitle: 'Sentence building, foundational grammar patterns, daily conversation, and reading comprehension.',
          tag: 'A2 Elementary',
          tone: 'slate',
        },
        {
          title: 'B1 \u2013 B2 Level',
          arabicSubtitle: '\u00AB \u0627\u0644\u0645\u064F\u0633\u0652\u062A\u064E\u0648\u0649 \u0627\u0644\u0645\u064F\u062A\u064E\u0648\u064E\u0633\u0651\u0650\u0637\u064F B1-B2 \u00BB',
          subtitle: 'Advanced morphology (sarf), syntax (nahw), fluent communicative practice, and authentic text analysis.',
          tag: 'B1-B2 Intermediate',
          tone: 'gold',
        },
        {
          title: 'CEFR & Attanat C2 Prep',
          arabicSubtitle: '\u00AB \u0627\u0650\u062E\u0652\u062A\u0650\u0628\u064E\u0627\u0631\u064E\u0627\u062A\u064F CEFR \u0648\u064E\u0627\u0644\u062A\u0651\u064E\u0627\u0646\u064E\u0627\u0644 C2 \u00BB',
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
        { icon: '\uD83C\uDF93', title: 'Arabic Language Teacher', desc: 'Become a professional Arabic educator teaching in schools, academies, or private lessons.' },
        { icon: '\uD83C\uDF10', title: 'Translator / Interpreter', desc: 'Work as a professional translator from Arabic to English or other languages at an international level.' },
        { icon: '\uD83D\uDCDC', title: 'Islamic Studies', desc: 'Read and understand the Quran, Hadith, and classical Fiqh directly from their original Arabic sources.' },
        { icon: '\u2708\uFE0F', title: 'International Career', desc: 'Open doors to diplomacy, international organizations, trade, and travel with Arabic fluency.' },
      ],
    },
    mentor: {
      eyebrow: 'Your Instructor',
      title: 'Years of Dedicated Guidance in Classical Arabic',
      name: 'Aisha Ahmad',
      role: 'Modern Standard Arabic Teacher \u2022 Bookblogger',
      arabicName: '\u0639\u064E\u0627\u0626\u0650\u0634\u064E\u0629 \u0623\u064E\u062D\u0652\u0645\u064E\u062F',
      arabicRole: '\u00AB \u0645\u064F\u0639\u064E\u0644\u0651\u0650\u0645\u064E\u0629\u064F \u0627\u0644\u0644\u0651\u064F\u063A\u064E\u0629\u0650 \u0627\u0644\u0639\u064E\u0631\u064E\u0628\u064A\u0651\u064E\u0629\u0650 \u0627\u0644\u0645\u064F\u0639\u064E\u0627\u0635\u0650\u0631\u064E\u0629\u0650 \u0648\u064E\u0645\u064F\u062F\u064E\u0648\u0651\u0650\u0646\u064E\u0629\u064F \u0643\u064F\u062A\u064F\u0628\u064D \u00BB',
      desc: 'Modern Standard Arabic educator and bookblogger. Inspiring students through modern communicative methodologies and a genuine love for reading.',
      videosLabel: 'From the Instructor',
      videosNote: "Clips from the instructor's Telegram channel",
      telegramChannelBtn: 'Visit Telegram Channel',
    },
    contact: {
      eyebrow: 'Telegram Admin',
      title: 'Reach out to find the perfect learning schedule',
      btn: 'Chat on Telegram',
    },
    footer: '\u00A9 2026 Aisha Uzbikiyya Academy. All rights reserved.',
  },
  RU: {
    nav: [
      { name: 'О нас', href: '#about' },
      { name: 'Курсы', href: '#courses' },
      { name: 'Цели', href: '#goals' },
      { name: 'Преподаватель', href: '#mentor' },
      { name: 'Контакты', href: '#contact' },
    ],
    brandName: 'Aisha Uzbikiyya',
    brandSub: '\u0627\u0644\u0623\u064E\u0643\u064E\u0627\u062F\u064A\u0645\u064A\u0651\u064E\u0629\u064F \u0627\u0644\u0623\u064F\u0648\u0632\u0652\u0628\u064E\u0643\u064A\u0651\u064E\u0629',
    heroArabicBanner: '\u0627\u0644\u0623\u064E\u0643\u064E\u0627\u062F\u064A\u0645\u064A\u0651\u064E\u0629\u064F \u0627\u0644\u0623\u064F\u0648\u0632\u0652\u0628\u064E\u0643\u064A\u0651\u064E\u0629 \u0644\u0650\u062A\u064E\u0639\u0652\u0644\u064A\u0645\u0650 \u0627\u0644\u0644\u0651\u064F\u063A\u064E\u0629\u0650 \u0627\u0644\u0639\u064E\u0631\u064E\u0628\u064A\u0651\u064E\u0629\u0650',
    heroEyebrow: 'Академия арабского языка',
    heroTitlePrefix: 'Обучаем вас ',
    heroTitleHighlight: 'арабскому языку',
    heroArabicWord: '\u00AB \u0627\u0644\u0644\u0651\u064F\u063A\u064E\u0629\u064F \u0627\u0644\u0639\u064E\u0631\u064E\u0628\u064A\u0651\u064E\u0629\u064F \u00BB',
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
        { title: 'Уровень A1', arabicSubtitle: '\u00AB \u0627\u0644\u0645\u064F\u0633\u0652\u062A\u064E\u0648\u0649 \u0627\u0644\u062A\u0651\u064E\u0645\u0652\u0647\u064A\u062F\u0650\u064A\u0651\u064F A1 \u00BB', subtitle: 'Алфавит, постановка махраджа, правила чтения и базовый словарь.', tag: 'A1 Начальный', tone: 'navy' },
        { title: 'Уровень A2', arabicSubtitle: '\u00AB \u0627\u0644\u0645\u064F\u0633\u0652\u062A\u064E\u0648\u0649 \u0627\u0644\u0623\u064E\u0633\u064E\u0627\u0633\u0650\u064A\u0651\u064F A2 \u00BB', subtitle: 'Базовая грамматика, бытовые диалоги и чтение текстов.', tag: 'A2 Элементарный', tone: 'slate' },
        { title: 'Уровень B1 \u2013 B2', arabicSubtitle: '\u00AB \u0627\u0644\u0645\u064F\u0633\u0652\u062A\u064E\u0648\u0649 \u0627\u0644\u0645\u064F\u062A\u064E\u0648\u064E\u0633\u0651\u0650\u0637\u064F B1-B2 \u00BB', subtitle: 'Грамматика (сарф и нахву), разговорная речь и чтение литературы.', tag: 'B1-B2 Средний', tone: 'gold' },
        { title: 'Подготовка CEFR и Attanat C2', arabicSubtitle: '\u00AB \u0627\u0650\u062E\u0652\u062A\u0650\u0628\u064E\u0627\u0631\u064E\u0627\u062A\u064F CEFR \u0648\u064E\u0627\u0644\u062A\u0651\u064E\u0627\u0646\u064E\u0627\u0644 C2 \u00BB', subtitle: 'Интенсивная подготовка к CEFR и Attanat C2. Возможность получить сертификат с нуля.', tag: 'CEFR & Attanat C2', tone: 'gold' },
      ],
    },
    goals: {
      eyebrow: 'Реальные цели',
      title: 'Чего вы достигнете, изучив арабский?',
      desc: 'Один из ведущих мировых языков — более 300 млн носителей.',
      items: [
        { icon: '\uD83C\uDF93', title: 'Преподаватель арабского', desc: 'Профессиональный педагог в школах или частной практике.' },
        { icon: '\uD83C\uDF10', title: 'Переводчик / Синхронист', desc: 'Профессиональный переводчик на международном уровне.' },
        { icon: '\uD83D\uDCDC', title: 'Исламские науки', desc: 'Читайте Коран, Хадисы на языке оригинала.' },
        { icon: '\u2708\uFE0F', title: 'Международная карьера', desc: 'Дипломатия, организации, бизнес и туризм.' },
      ],
    },
    mentor: {
      eyebrow: 'О преподавателе',
      title: 'Опыт и правильная методика — основа успеха',
      name: 'Aisha Ahmad',
      role: 'Преподаватель арабского языка • Букблогер',
      arabicName: '\u0639\u064E\u0627\u0626\u0650\u0634\u064E\u0629 \u0623\u064E\u062D\u0652\u0645\u064E\u062F',
      arabicRole: '\u00AB \u0645\u064F\u0639\u064E\u0644\u0651\u0650\u0645\u064E\u0629\u064F \u0627\u0644\u0644\u0651\u064F\u063A\u064E\u0629\u0650 \u0627\u0644\u0639\u064E\u0631\u064E\u0628\u064A\u0651\u064E\u0629\u0650 \u0627\u0644\u0645\u064F\u0639\u064E\u0627\u0635\u0650\u0631\u064E\u0629\u0650 \u0648\u064E\u0645\u064F\u062F\u064E\u0648\u0651\u0650\u0646\u064E\u0629\u064F \u0643\u064F\u062A\u064F\u0628\u064D \u00BB',
      desc: 'Преподаватель современного арабского языка и книжный блогер.',
      videosLabel: 'От преподавателя',
      videosNote: 'Видео из Telegram-канала преподавателя',
      telegramChannelBtn: 'Перейти в Telegram-канал',
    },
    contact: {
      eyebrow: 'Telegram администратор',
      title: 'Напишите нам и подберите подходящий график',
      btn: 'Написать в Telegram',
    },
    footer: '\u00A9 2026 Aisha Uzbikiyya Academy. Все права защищены.',
  },
};

const languageOptions = ['UZ', 'EN', 'RU'];

const TELEGRAM_CHANNEL_URL = 'https://t.me/aishauzbikiyya_admin';

const mentorVideos = [
  { videoUrl: 'https://t.me/aisha_uzbikiyya/265', id: 1 },
  { videoUrl: 'https://t.me/aisha_uzbikiyya/135', id: 2 },
  { videoUrl: 'https://t.me/aisha_uzbikiyya/185', id: 3 },
];

function Landing() {
  const [lang, setLang] = useState('UZ');
  const t = content[lang] || content.UZ;

  // Natijalar va sharhlar
  const [results, setResults] = useState([]);
  const [reviews, setReviews] = useState([]);

  // O'quvchi natijalari
  const [gradeGroupId, setGradeGroupId] = useState('');
  const [gradeStudents, setGradeStudents] = useState([]);
  const [gradeLoading, setGradeLoading] = useState(false);
  const [gradeError, setGradeError] = useState('');
  const [gradeFetched, setGradeFetched] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/results`)
      .then(r => r.json())
      .then(d => setResults(d.results || []))
      .catch(() => setResults([]));
    fetch(`${API}/api/reviews`)
      .then(r => r.json())
      .then(d => setReviews(d.reviews || []))
      .catch(() => setReviews([]));
  }, []);

  const lookupGrades = async (e) => {
    e.preventDefault();
    if (!gradeGroupId.trim()) return;
    setGradeLoading(true);
    setGradeError('');
    setGradeFetched(false);
    try {
      const res = await fetch(`${API}/api/leaderboard/${gradeGroupId}`);
      const data = await res.json();
      if (data.leaderboard && data.leaderboard.length > 0) {
        setGradeStudents(data.leaderboard);
        setGradeFetched(true);
      } else {
        setGradeError(lang === 'UZ' ? 'Bu ID bilan guruh topilmadi.' : lang === 'RU' ? 'Группа не найдена.' : 'Group not found.');
      }
    } catch {
      setGradeError(lang === 'UZ' ? 'Server bilan ulanishda xatolik.' : 'Server error.');
    }
    setGradeLoading(false);
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
          <div className="brand-wrap" aria-label="Aisha Uzbikiyya logo">
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
          </div>

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
                <span className="banner-icon">&#10022;</span>
                <span className="academy-arabic">{t.heroArabicBanner}</span>
                <span className="banner-icon">&#10022;</span>
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
                <a href={TELEGRAM_CHANNEL_URL} target="_blank" rel="noreferrer" className="primary-btn">
                  {t.enrollBtn}
                </a>
                <a href={TELEGRAM_CHANNEL_URL} target="_blank" rel="noreferrer" className="secondary-link">
                  {t.telegramBtn} &#8594;
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
                  <strong>12 dars</strong>
                </div>
                <div className="stat-box accent">
                  <span className="small-label">Daraja</span>
                  <strong>Sefr &rarr; C2</strong>
                </div>
              </div>

              <div className="mini-card card-bottom">
                <div className="card-labels">
                  <span className="label">Sertifikat</span>
                </div>
                <strong>CEFR & Attanat</strong>
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
                    {t.courses.btn} &#8594;
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
                  <div className="mentor-avatar">&#1593;</div>
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
              </div>
            </div>
          </div>
        </section>

        {/* O'quvchi natijalari tekshirish bo'limi */}
        <section className="grades-section" id="grades">
          <div className="container">
            <div className="section-header">
              <div className="section-title-wrap">
                <span className="eyebrow eyebrow-dark">
                  {lang === 'UZ' ? 'Natijalarni ko‘rish' : lang === 'RU' ? 'Проверить результат' : 'Check Results'}
                </span>
              </div>
              <h2>
                {lang === 'UZ' ? 'Guruh ID orqali o‘z natijangizni ko‘ring' : lang === 'RU' ? 'Введите ID группы, чтобы увидеть рейтинг' : 'Enter your Group ID to see your ranking'}
              </h2>
              <p className="goals-desc">
                {lang === 'UZ' ? 'Ustozingiz bergan guruh ID raqamini kiriting.' : lang === 'RU' ? 'Введите ID группы, выданный преподавателем.' : 'Enter the group ID provided by your instructor.'}
              </p>
            </div>
            <form onSubmit={lookupGrades} className="grades-lookup-form">
              <input
                type="text"
                className="grades-input"
                placeholder={lang === 'UZ' ? 'Guruh ID raqami...' : lang === 'RU' ? 'ID группы...' : 'Group ID...'}
                value={gradeGroupId}
                onChange={e => setGradeGroupId(e.target.value)}
              />
              <button type="submit" className="primary-btn" disabled={gradeLoading}>
                {gradeLoading ? '...' : lang === 'UZ' ? 'Ko‘rish' : lang === 'RU' ? 'Показать' : 'View'}
              </button>
            </form>
            {gradeError && <p className="grades-error">{gradeError}</p>}
            {gradeFetched && gradeStudents.length > 0 && (
              <div className="grades-table-wrap">
                <table className="grades-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{lang === 'UZ' ? 'Ism' : lang === 'RU' ? 'Имя' : 'Name'}</th>
                      <th>{lang === 'UZ' ? 'Ball' : lang === 'RU' ? 'Баллы' : 'Points'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradeStudents.map((s, idx) => (
                      <tr key={s.telegram_id} className={idx < 3 ? 'top-row' : ''}>
                        <td className="rank-cell">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </td>
                        <td>{s.full_name}</td>
                        <td><span className="points-badge pub">{s.current_month_points}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Natijalar (skrinshotlar) bo'limi */}
        {results.length > 0 && (
          <section className="results-section" id="results">
            <div className="container">
              <div className="section-header">
                <div className="section-title-wrap">
                  <span className="eyebrow eyebrow-dark">
                    {lang === 'UZ' ? 'Haqiqiy natijalar' : lang === 'RU' ? 'Реальные результаты' : 'Real Results'}
                  </span>
                </div>
                <h2>
                  {lang === 'UZ' ? 'O‘quvchilarimizning muvaffaqiyatlari' : lang === 'RU' ? 'Достижения наших студентов' : 'Student Achievements'}
                </h2>
              </div>
              <div className="results-gallery">
                {results.map(r => (
                  <div key={r.id} className="result-card">
                    <img src={`${API}/uploads/${r.filename}`} alt={r.caption} />
                    {r.caption && <p className="result-caption">{r.caption}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Sharhlar bo'limi */}
        {reviews.length > 0 && (
          <section className="reviews-section" id="reviews">
            <div className="container">
              <div className="section-header">
                <div className="section-title-wrap">
                  <span className="eyebrow eyebrow-dark">
                    {lang === 'UZ' ? 'Sharhlar' : lang === 'RU' ? 'Отзывы' : 'Reviews'}
                  </span>
                </div>
                <h2>
                  {lang === 'UZ' ? 'O‘quvchilarimiz nima deydi' : lang === 'RU' ? 'Что говорят наши студенты' : 'What Our Students Say'}
                </h2>
              </div>
              <div className="reviews-grid">
                {reviews.map(r => (
                  <div key={r.id} className="review-card">
                    <div className="review-stars">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</div>
                    <p className="review-text">"{r.text}"</p>
                    <div className="review-author">
                      <div className="review-avatar">{r.name.charAt(0)}</div>
                      <span>{r.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Bog'lanish bo'limi */}
        <section className="contact-section" id="contact">
          <div className="container">
            <div className="contact-card">
              <div>
                <div className="section-title-wrap">
                  <span className="eyebrow eyebrow-dark">{t.contact.eyebrow}</span>
                </div>
                <h2>{t.contact.title}</h2>
              </div>
              <a
                href={TELEGRAM_CHANNEL_URL}
                target="_blank"
                rel="noreferrer"
                className="telegram-btn"
              >
                {t.contact.btn} &#10022;
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="container footer-container">
          <span>{t.footer}</span>
          <span className="footer-arabic-motto">
            &#1575;&#1604;&#1571;&#1614;&#1603;&#1614;&#1575;&#1583;&#1610;&#1605;&#1610;&#1617;&#1614;&#1577;&#1615; &#1575;&#1604;&#1571;&#1615;&#1608;&#1586;&#1618;&#1576;&#1614;&#1603;&#1610;&#1617;&#1614;&#1577; &#8212; &#1576;&#1616;&#1573;&#1616;&#1578;&#1618;&#1602;&#1614;&#1575;&#1606;&#1613; &#1608;&#1614;&#1575;&#1581;&#1618;&#1578;&#1616;&#1585;&#1614;&#1575;&#1601;&#1616;&#1610;&#1617;&#1614;&#1577;&#1613;
          </span>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
