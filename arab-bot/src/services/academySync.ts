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
  student?: { student_code: string; full_name: string } | null;
  book: { id: number | null; title: string; pdfPath: string } | null;
}

/**
 * Sayt backend API ga so'rov yuborish.
 * Agar asosiy URL tarmoq xatosi bersa, zaxira lokal manzilga o'tiladi.
 * Agar serverdan HTTP javob kelsa (masalan 400 yoki 404), bu javob to'g'ridan-to'g'ri qaytariladi.
 */
async function sendAcademyRequest(path: string, payload: Record<string, unknown>): Promise<unknown> {
  const secret = (config.academySyncSecret || process.env.BOT_SYNC_SECRET || process.env.ACADEMY_SYNC_SECRET || '').trim();
  if (!secret) {
    throw new Error('BOT_SYNC_SECRET yoki ACADEMY_SYNC_SECRET sozlanmagan');
  }

  const primaryUrl = (config.academyApiUrl || 'http://localhost:5000').trim().replace(/\/+$/, '');
  const candidateUrls = [
    primaryUrl,
    'https://arabic-academy.onrender.com',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
  ];

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

    let response: Response;
    try {
      const endpointUrl = new URL(path.replace(/^\/+/, ''), `${apiUrl.origin}/`);
      response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bot-sync-secret': secret,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });
    } catch (networkErr: any) {
      // Tarmoq xatosi yuz bersa, keyingi zaxira URL ga o'tamiz
      lastError = networkErr instanceof Error ? networkErr : new Error(String(networkErr));
      continue;
    }

    // Server javob berdi! Javobni qayta ishlaymiz
    const responseText = await response.text();

    let data: { error?: string };
    try {
      data = JSON.parse(responseText) as { error?: string };
    } catch {
      throw new Error(`${targetBase} sayt API noto‘g‘ri javob qaytardi (HTTP ${response.status})`);
    }

    if (!response.ok) {
      // Serverning o'zi xabar berdi (masalan: "Guruh kodi noto‘g‘ri yoki guruh topilmadi")
      throw new Error(data.error || `Sayt API xatosi (${response.status})`);
    }

    if (i > 0 && targetBase !== primaryUrl) {
      console.log(`ℹ️ [Academy Sync] Asosiy URL (${primaryUrl}) o‘rniga lokal backend (${targetBase}) ga muvaffaqiyatli ulandi.`);
    }

    return data;
  }

  throw lastError || new Error('Sayt API ga ulanib bo‘lmadi. Backend server ishlayotganini tekshiring.');
}

async function fetchPdfBuffer(pdfPath: string): Promise<Buffer> {
  const candidateBases = [
    (config.academyApiUrl || '').trim().replace(/\/+$/, ''),
    'https://arabic-academy.onrender.com',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
  ].filter(Boolean);

  const cleanPath = pdfPath.startsWith('/') ? pdfPath : `/${pdfPath}`;
  const filename = pdfPath.split('/').pop() || '';
  let lastErr = '';

  for (const base of candidateBases) {
    try {
      const targetUrl = new URL(cleanPath.replace(/^\/+/, ''), `${base}/`);
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

  // HTTP orqali topilmasa, to'g'ridan-to'g'ri bazadan qidiramiz
  try {
    const dbResult = await db.query(
      'SELECT pdf_data FROM books WHERE pdf_path = $1 OR pdf_path LIKE $2 LIMIT 1',
      [cleanPath, `%${filename}`]
    );
    if (dbResult.rows.length > 0 && dbResult.rows[0].pdf_data) {
      return Buffer.from(dbResult.rows[0].pdf_data);
    }
  } catch (dbErr: any) {
    console.warn('[Academy Sync] DB dan kitob PDF olishda xatolik:', dbErr.message);
  }

  throw new Error(`Guruh kitobining PDF fayli olinmadi (${lastErr || '404'})`);
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
  fullName: string,
  studentCode?: string
): Promise<AcademyGroupAccess> {
  return await sendAcademyRequest('/api/bot/verify-group-code', {
    access_code: accessCode,
    telegram_id: telegramId,
    full_name: fullName,
    student_code: studentCode || '',
  }) as AcademyGroupAccess;
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
