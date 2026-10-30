import { db } from '../db/index.js';
import { config } from '../config.js';
import { PdfBookService } from './pdfBook.js';

export interface AcademyStudentStats {
  telegramId: number;
  updatedAt: string;
  groups: Array<{
    groupId: number;
    groupName: string;
    rank: number;
    groupSize: number;
    monthPoints: number;
    totalPoints: number;
    gradedLessons: number;
    averageGrade: number | null;
    progressDifference: number | null;
    progressStatus: 'improved' | 'declined' | 'unchanged' | 'no-data';
    leaderboard: Array<{
      telegramId: number;
      fullName: string;
      rank: number;
      monthPoints: number;
    }>;
  }>;
}

export interface AcademyBook {
  id: number;
  title: string;
  pdfPath: string;
}

export interface AcademyGroupAccess {
  group: { id: number; name: string };
  book: { id: number | null; title: string; pdfPath: string } | null;
}

/**
 * Sayt backend API ga so'rov yuborish.
 * Agar asosiy URL (masalan Render) ishlamasa yoki xato bersa,
 * lokal backend (http://localhost:5000) ga avtomatik zaxira ulanish amalga oshiriladi.
 */
async function sendAcademyRequest(path: string, payload: Record<string, unknown>): Promise<unknown> {
  const secret = (config.academySyncSecret || process.env.BOT_SYNC_SECRET || process.env.ACADEMY_SYNC_SECRET || '').trim();
  if (!secret) {
    throw new Error('BOT_SYNC_SECRET yoki ACADEMY_SYNC_SECRET sozlanmagan');
  }

  // Ehtimoliy URL'lar ro'yxati (eng birinchi o'rinda .env dagi URL)
  const primaryUrl = (config.academyApiUrl || 'http://localhost:5000').trim().replace(/\/+$/, '');
  const candidateUrls = [
    primaryUrl,
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:3000',
  ];

  // Takrorlanmas qilib olamiz
  const uniqueUrls: string[] = [];
  for (const u of candidateUrls) {
    if (u && !uniqueUrls.includes(u)) {
      uniqueUrls.push(u);
    }
  }

  let lastError: Error | null = null;

  for (let i = 0; i < uniqueUrls.length; i++) {
    const targetBase = uniqueUrls[i];
    let apiUrl: URL;
    try {
      apiUrl = new URL(targetBase);
    } catch {
      continue;
    }

    try {
      const endpointUrl = new URL(path.replace(/^\/+/, ''), `${apiUrl.origin}/`);
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bot-sync-secret': secret,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      const contentType = response.headers.get('content-type') || '';
      const responseText = await response.text();

      if (!contentType.includes('application/json')) {
        if (response.status === 404 && responseText.includes('Cannot POST')) {
          throw new Error(`${path} endpointi ${targetBase} manzilida topilmadi`);
        }
        throw new Error(`${targetBase} sayt API JSON emas javob qaytardi (HTTP ${response.status})`);
      }

      let data: { error?: string };
      try {
        data = JSON.parse(responseText) as { error?: string };
      } catch {
        throw new Error(`${targetBase} API noto‘g‘ri JSON qaytardi (HTTP ${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Sayt API xatosi (${response.status})`);
      }

      // Agar zaxira URL orqali muvaffaqiyatli ulangan bo'lsa va bu birinchi URL bo'lmasa, eslatib qo'yamiz
      if (i > 0 && targetBase !== primaryUrl) {
        console.log(`ℹ️ [Academy Sync] Asosiy URL (${primaryUrl}) o‘rniga lokal backend (${targetBase}) ga muvaffaqiyatli ulandi.`);
      }

      return data;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Faqat bitta URL bo'lsa yoki oxirgisi bo'lsa, davom etmaymiz
      if (i === uniqueUrls.length - 1) {
        break;
      }
    }
  }

  throw lastError || new Error('Sayt API ga ulanib bo‘lmadi');
}

export async function submitAcademyReview(telegramId: number, name: string, text: string): Promise<void> {
  await sendAcademyRequest('/api/bot/reviews', { telegram_id: telegramId, name, text });
}

export async function getAcademyStudentStats(telegramId: number): Promise<AcademyStudentStats> {
  return await sendAcademyRequest('/api/bot/student-stats', { telegram_id: telegramId }) as AcademyStudentStats;
}

export async function getAcademyBooks(): Promise<AcademyBook[]> {
  const response = await sendAcademyRequest('/api/bot/books', {});
  return (response as { books: AcademyBook[] }).books;
}

export async function verifyAcademyGroupCode(
  accessCode: string,
  telegramId: number,
  fullName: string
): Promise<AcademyGroupAccess> {
  return await sendAcademyRequest('/api/bot/verify-group-code', {
    access_code: accessCode,
    telegram_id: telegramId,
    full_name: fullName,
  }) as AcademyGroupAccess;
}

async function fetchPdfBuffer(pdfPath: string): Promise<Buffer> {
  const candidateBases = [
    (config.academyApiUrl || '').trim().replace(/\/+$/, ''),
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:3000',
  ].filter(Boolean);

  const cleanPath = pdfPath.startsWith('/') ? pdfPath : `/${pdfPath}`;
  let lastErr = '';

  for (const base of candidateBases) {
    try {
      const targetUrl = new URL(cleanPath, `${base}/`);
      const res = await fetch(targetUrl, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        return Buffer.from(arrayBuf);
      }
      lastErr = `HTTP ${res.status}`;
    } catch (e: any) {
      lastErr = e.message;
    }
  }
  throw new Error(`Guruh kitobining PDF fayli olinmadi (${lastErr || '404'})`);
}

export async function getAcademyBookText(bookId: number): Promise<{ title: string; text: string }> {
  const response = await sendAcademyRequest(`/api/bot/books/${bookId}`, {});
  const book = response as AcademyBook;
  const buffer = await fetchPdfBuffer(book.pdfPath);

  const text = await PdfBookService.extractTextFromBuffer(buffer);
  if (!text) {
    throw new Error('Kitob PDF faylidan matn ajratib olinmadi');
  }
  return { title: book.title, text };
}

export async function getAcademyGroupBook(
  groupId: number,
  telegramId: number
): Promise<{ id: number; title: string; text: string }> {
  const book = await sendAcademyRequest(`/api/bot/groups/${groupId}/book`, {
    telegram_id: telegramId,
  }) as AcademyBook;

  const buffer = await fetchPdfBuffer(book.pdfPath);
  const text = await PdfBookService.extractTextFromBuffer(buffer);
  if (!text) throw new Error('Guruh kitobining PDF faylidan matn ajratib olinmadi');
  return { id: book.id, title: book.title, text };
}

export async function syncAcademyStats(): Promise<void> {
  const [users, groups, tests, gradedStudents] = await Promise.all([
    db.query("SELECT COUNT(*) AS count FROM users WHERE status = 'active'").catch(() => ({ rows: [{ count: 0 }] })),
    db.query('SELECT COUNT(*) AS count FROM groups WHERE is_active = TRUE').catch(() => ({ rows: [{ count: 0 }] })),
    db.query('SELECT COUNT(*) AS count FROM user_tests').catch(() => ({ rows: [{ count: 0 }] })),
    db.query('SELECT COUNT(*) AS count FROM users WHERE grade IS NOT NULL AND grade > 0').catch(() => ({ rows: [{ count: 0 }] })),
  ]);
  const count = (rows: Array<{ count: number | string }>) => Number(rows[0]?.count || 0);

  await sendAcademyRequest('/api/bot/stats', {
    users: count(users.rows),
    groups: count(groups.rows),
    tests: count(tests.rows),
    gradedStudents: count(gradedStudents.rows),
  });
}
