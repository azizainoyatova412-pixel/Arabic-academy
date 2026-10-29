import { Keyboard, InlineKeyboard } from 'grammy';

export class BotKeyboards {
  /**
   * Til tanlash inline klaviaturasi (O'zbek, Rus, Ingliz)
   */
  public static async getLanguageKeyboard(): Promise<InlineKeyboard> {
    const keyboard = new InlineKeyboard();
    keyboard.text("🇺🇿 O'zbek tili", "set_lang:uz")
            .text("🇷🇺 Русский язык", "set_lang:ru")
            .row()
            .text("🇬🇧 English", "set_lang:en");
    return keyboard;
  }

  /**
   * Asosiy menyu klaviaturasi (Admin tugmasi yashirin, menyuda ko'rinmaydi)
   */
  public static async getMainMenu(lang: string = 'uz'): Promise<Keyboard> {
    const keyboard = new Keyboard();

    if (lang === 'ru') {
      keyboard.text('📊 Общий рейтинг и Статистика').row();
      keyboard.text('📘 Тест по учебнику').text('🤖 ИИ Учитель').row();
      keyboard.text('💬 Связь с Администратором');
    } else if (lang === 'en') {
      keyboard.text('📊 General Ranking & Stats').row();
      keyboard.text('📘 Book-based test').text('🤖 AI Tutor').row();
      keyboard.text('💬 Contact Administrator');
    } else {
      keyboard.text('📊 Umumiy Reyting va Statistika').row();
      keyboard.text('📘 Kitob asosida test').text('🤖 AI Ustoz').row();
      keyboard.text('💬 Admin bilan bog\'lanish');
    }

    keyboard.resized();
    return keyboard;
  }

  /**
   * Kursga yozilish inline klaviaturasi
   */
  public static async getEnrollKeyboard(lang: string = 'uz'): Promise<InlineKeyboard> {
    const btnText =
      lang === 'ru'
        ? '✨ ✍️ Записаться на курс'
        : lang === 'en'
        ? '✨ ✍️ Enroll in Course'
        : '✨ ✍️ Kursga Yozilish';
    return new InlineKeyboard().text(btnText, 'action_enroll');
  }

  /**
   * Admin bilan bog'lanish tugmasi (To'g'ridan-to'g'ri Telegram chatiga havola)
   */
  public static getContactAdminKeyboard(url: string, lang: string = 'uz', customText?: string): InlineKeyboard {
    const defaultText =
      lang === 'ru'
        ? '💬 Написать администратору'
        : lang === 'en'
        ? '💬 Contact Administrator'
        : '💬 Admin bilan bog\'lanish';
    return new InlineKeyboard().url(customText || defaultText, url);
  }

  /**
   * Statistika: Bitta tugma bilan ochilib yopiladigan reyting klaviaturasi (⬇️ / ⬆️)
   * Guruh tanlash olib tashlangan, butun hamma guruhlar 1 ta reytingda ko'rsatiladi
   */
  public static getStatsToggleKeyboard(isOpen: boolean, lang: string = 'uz'): InlineKeyboard {
    const kb = new InlineKeyboard();
    if (isOpen) {
      const text =
        lang === 'ru'
          ? '⬆️ Скрыть рейтинг'
          : lang === 'en'
          ? '⬆️ Close Ranking'
          : '⬆️ Reyting jadvalini yopish';
      kb.text(text, 'toggle_stats:close');
    } else {
      const text =
        lang === 'ru'
          ? '⬇️ Посмотреть полный рейтинг'
          : lang === 'en'
          ? '⬇️ View Full Ranking'
          : '⬇️ To\'liq reyting jadvalini ko\'rish';
      kb.text(text, 'toggle_stats:open');
    }
    return kb;
  }

  /**
   * Test yakunida xato savollarni bitta tugma bilan ochish / yopish
   */
  public static getQuizReviewKeyboard(isOpen: boolean, lang: string = 'uz'): InlineKeyboard {
    const kb = new InlineKeyboard();
    if (isOpen) {
      const text =
        lang === 'ru'
          ? '⬆️ Скрыть разбор ошибок'
          : lang === 'en'
          ? '⬆️ Close Mistakes'
          : '⬆️ Xato qilingan savollarni yopish';
      kb.text(text, 'toggle_quiz_review:close');
    } else {
      const text =
        lang === 'ru'
          ? '⬇️ Посмотреть разбор ошибок'
          : lang === 'en'
          ? '⬇️ View Mistakes'
          : '⬇️ Xato qilingan savollarni ko\'rish';
      kb.text(text, 'toggle_quiz_review:open');
    }
    return kb;
  }

  /**
   * Admin panel boshqaruv inline klaviaturasi (/admin buyrug'i uchun)
   */
  public static getAdminPanelKeyboard(adminUrl: string): InlineKeyboard {
    const kb = new InlineKeyboard();
    const isLocalhost = /localhost|127\.0\.0\.1/i.test(adminUrl);
    const isValidHttpUrl = /^https?:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}/i.test(adminUrl) && !isLocalhost;

    if (isValidHttpUrl) {
      kb.url('🌐 Veb Admin Panelga Kirish', adminUrl).row();
    }

    kb.text('📊 Tizim Statistikasi', 'admin_view:stats')
      .text('👥 Guruhlar Nazorati', 'admin_view:groups')
      .row()
      .text('🎓 O\'quvchilar va Baholar', 'admin_view:students')
      .text('📝 Test Natijalari', 'admin_view:tests')
      .row()
      .text('🔄 Yangilash', 'admin_view:refresh');

    return kb;
  }

  /**
   * Guruhlar ro'yxati (Kirish kodi kiritish uchun)
   */
  public static createGroupsKeyboard(groups: Array<{ id: number; name: string }>): InlineKeyboard {
    const keyboard = new InlineKeyboard();
    groups.forEach((grp) => {
      keyboard.text(`📚 👥 ${grp.name}`, `join_group:${grp.id}`).row();
    });
    return keyboard;
  }

  /**
   * Test savoli variantlari (A, B, C, D)
   */
  public static createQuizKeyboard(options: string[]): InlineKeyboard {
    const keyboard = new InlineKeyboard();
    const letters = ['A', 'B', 'C', 'D'];

    options.slice(0, 4).forEach((opt, idx) => {
      const cleanOpt = opt
        .replace(/^(?:[A-DА-Дa-dа-д1-4][:.)\s-]+|[🅰️🅱️🅲️🅳️\u{1F170}-\u{1F189}]\s*)/u, '')
        .trim();
      const letter = letters[idx] || `${idx + 1}`;
      keyboard.text(`${letter}) ${cleanOpt}`, `quiz_answer:${idx}`).row();
    });

    return keyboard;
  }

  /**
   * AI Ustoz rejimidan chiqish tugmasi
   */
  public static getAITutorExitKeyboard(lang: string = 'uz'): InlineKeyboard {
    const text =
      lang === 'ru'
        ? '⬅️ Завершить урок с ИИ'
        : lang === 'en'
        ? '⬅️ Exit AI Tutor'
        : '⬅️ AI Ustoz suhbatidan chiqish';
    return new InlineKeyboard().text(text, 'exit_ai_tutor');
  }

  public static getTutorBooksKeyboard(books: Array<{ id: number; title: string }>, lang: string = 'uz'): InlineKeyboard {
    const keyboard = new InlineKeyboard();
    for (const book of books) {
      keyboard.text(`📖 ${book.title}`.slice(0, 60), `tutor_book:${book.id}`).row();
    }
    const exitText = lang === 'ru' ? '⬅️ Назад' : lang === 'en' ? '⬅️ Back' : '⬅️ Orqaga';
    keyboard.text(exitText, 'exit_ai_tutor');
    return keyboard;
  }

  public static getGeminiExitKeyboard(lang: string = 'uz'): InlineKeyboard {
    return this.getAITutorExitKeyboard(lang);
  }
}
