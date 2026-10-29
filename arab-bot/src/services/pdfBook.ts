import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';

export interface BookTopic {
  number: number;
  title: string;
  summary: string;
  rules: string;
}

export class PdfBookService {
  /**
   * PDF fayldan matn ajratib olish
   */
  public static async extractTextFromPdf(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      return await this.extractTextFromBuffer(dataBuffer);
    } catch (err) {
      console.warn('⚠️ [PDF Parse Error]:', err);
      return '';
    }
  }

  public static async extractTextFromBuffer(dataBuffer: Buffer): Promise<string> {
    try {
      const pdfParseModule = await import('pdf-parse');
      const pdf = (pdfParseModule as any).default || pdfParseModule;
      const parsed = await pdf(dataBuffer);
      return (parsed.text || '').trim();
    } catch (err) {
      console.warn('⚠️ [PDF Parse Error]:', err);
      return '';
    }
  }

  /**
   * Kitob matnidan ketma-ket dars mavzularini (1-mavzu, 2-mavzu...) ajratish
   */
  public static async generateTopicsFromBook(
    bookName: string,
    bookText?: string
  ): Promise<BookTopic[]> {
    // Agar kitob matni mavjud bo'lsa va Gemini API kaliti bo'lsa, mavzular rejasini tuzamiz
    const apiKey = (config.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
    if (apiKey) {
      try {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

        const excerpt = (bookText || '').slice(0, 15000);
        const prompt = `Siz malakali arab tili metodistisiz.
Quyidagi arab tili darsligi asosida ketma-ket 1-mavzudan boshlab 10-15 ta asosiy dars mavzulari rejasini tuzing.
Har bir mavzu aniq ketma-ketlikda (1, 2, 3...) bo'lsin.

Kitob nomi: "${bookName}"
Kitob matnidan namuna:
${excerpt || '(Standart arab tili darsligi dasturi)'}

Javobni FAQAT toza JSON formatida quyidagicha qaytaring:
[
  {
    "number": 1,
    "title": "1-mavzu nomi (masalan: Arab alifbosi va harflar)",
    "summary": "Mavzuning qisqacha mazmuni",
    "rules": "Asosiy qoidalar va o'rganiladigan tushunchalar"
  }
]`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
          text = text.slice(start, end + 1);
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed) && parsed.length >= 3) {
            return parsed.map((item, idx) => ({
              number: Number(item.number) || idx + 1,
              title: String(item.title || `${idx + 1}-dars`).trim(),
              summary: String(item.summary || '').trim(),
              rules: String(item.rules || '').trim(),
            }));
          }
        }
      } catch (e) {
        console.warn('⚠️ [Generate Topics Error]:', e);
      }
    }

    // Zaxira standart darslik mavzulari (Mabda ul-Qiroat / Durusul Lugha tizimi)
    return this.getDefaultTopics(bookName);
  }

  public static getDefaultTopics(bookName?: string): BookTopic[] {
    return [
      {
        number: 1,
        title: "1-dars: Arab harflari va to'g'ri maxrajlar",
        summary: "Arab alifbosidagi 28 ta harf, ularning nomlari, yozilishi va to'g'ri talaffuz maxrajlari.",
        rules: "Harflarning kalima boshida, o'rtasida va oxirida yozilishi hamda o'zidan keyingi harfga ulanmaydigan harflar."
      },
      {
        number: 2,
        title: "2-dars: Qisqa unlilar — Harakatlar (Fatha, Kasra, Damma)",
        summary: "Harakatlarning vazifasi va ularning harflar bilan to'g'ri talaffuzi.",
        rules: "Fatha [a]/[o] tovushi, Kasra [i] tovushi, Damma [u] tovushi. Yo'g'on va ingichka harflarda talaffuz farqlari."
      },
      {
        number: 3,
        title: "3-dars: Sukun va Tanvin qoidalari",
        summary: "Unlisiz harf (sukun) va otlar oxiridagi noaniqlik belgisi (tanvin).",
        rules: "Sukun (ْ ) unlisiz to'xtash. Tanvin (an, in, un) tovushlari va ularning yozilishi."
      },
      {
        number: 4,
        title: "4-dars: Cho'ziq unlilar (Mad harflari)",
        summary: "Alif, Vov va Yo harflari orqali cho'zib o'qish qoidalari.",
        rules: "Fathadan keyin sokin alif, kasradan keyin sokin yo, dammadan keyin sokin vov kelsa 2 harakat cho'ziladi."
      },
      {
        number: 5,
        title: "5-dars: Tashdid (Shadda) qoidasi",
        summary: "Ikkilangan harflar va ularning to'g'ri talaffuzi.",
        rules: "Shadda (ّ ) bitta harfni ikkita qilib o'qitadi: birinchisi sokin, ikkinchisi harakatli."
      },
      {
        number: 6,
        title: "6-dars: Shamsiy va Qamariy harflar (Alif-Lom qoidasi)",
        summary: "Aniqlik artikli (ال) ning harflarga ulanish qoidalari.",
        rules: "Qamariy harflarda 'Lam' o'qiladi (al-kitabu), Shamsiy harflarda 'Lam' o'qilmay shadda bilan o'qiladi (ash-shamsu)."
      },
      {
        number: 7,
        title: "7-dars: Ko'rsatish olmoshlari (Haza va Hazihi)",
        summary: "Yaqindagi narsalarni ko'rsatish: muzakkar (erkak) va muannas (ayol) jinsi.",
        rules: "Haza (هَذَا) muzakkar uchun, Hazihi (هَذِهِ) muannas (oxirida ta-marbuta bo'lgan) so'zlar uchun."
      },
      {
        number: 8,
        title: "8-dars: Uzoqqa ko'rsatish olmoshlari (Zalika va Tilka)",
        summary: "Uzoqdagi narsalarni ko'rsatish va sodda jumlalar tuzish.",
        rules: "Zalika (ذَلِكَ) muzakkar, Tilka (تِلْكَ) muannas uchun ishlatiladi."
      },
      {
        number: 9,
        title: "9-dars: Bog'langan olmoshlar va egalik qo'shimchalari",
        summary: "Mening kitobim, sening qalaming kabi so'zlarni yasash.",
        rules: "Kitabiy (كِتَابِي) — mening kitobim, Kitabuka (كِتَابُكَ) — sening kitobing, Kitabuhu (كِتَابُهُ) — uning kitobi."
      },
      {
        number: 10,
        title: "10-dars: Sodda ismiy jumlalar (Mubtada va Xabar)",
        summary: "Arab tilida ega va kesim orqali to'liq gaplar tuzish.",
        rules: "Mubtada odatda ma'rifa (aniq), Xabar esa nakira (noaniq) bo'lib, ikkalasi ham marfu' (bosh kelishikda) bo'ladi."
      }
    ];
  }
}
