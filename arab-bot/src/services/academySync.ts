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

async function sendAcademyRequest(path: string, payload: Record<string, unknown>): Promise<unknown> {
  if (!config.academyApiUrl || !config.academySyncSecret) {
    throw new Error('ACADEMY_API_URL yoki ACADEMY_SYNC_SECRET sozlanmagan');
  }

  let apiUrl: URL;
  try {
    apiUrl = new URL(config.academyApiUrl);
  } catch {
    throw new Error('ACADEMY_API_URL noto‘g‘ri formatda; saytning to‘liq https:// manzilini kiriting');
  }
  if (!['http:', 'https:'].includes(apiUrl.protocol)) {
    throw new Error('ACADEMY_API_URL http:// yoki https:// bilan boshlanishi kerak');
  }
  if (
    process.env.NODE_ENV === 'production' &&
    (apiUrl.hostname === 'localhost' || apiUrl.hostname === '127.0.0.1')
  ) {
    throw new Error('ACADEMY_API_URL production muhitida localhost bo‘la olmaydi; saytning Render URL manzilini kiriting');
  }

  let response: Response;
  try {
    response = await fetch(new URL(path, `${apiUrl.origin}/`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-sync-secret': config.academySyncSecret,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    const cause = error instanceof Error
      ? (error as Error & { cause?: { code?: string; message?: string } }).cause
      : undefined;
    const reason = cause?.code || cause?.message || (error instanceof Error ? error.message : 'noma’lum tarmoq xatosi');
    throw new Error(`${apiUrl.host} saytiga ulanish amalga oshmadi (${reason}); ACADEMY_API_URL va sayt server holatini tekshiring`);
  }
  const responseText = await response.text();
  const contentType = response.headers.get('content-type') || '';
  let data: { error?: string };

  if (!contentType.includes('application/json')) {
    if (response.status === 404 && responseText.includes('Cannot POST')) {
      throw new Error(`${path} endpointi saytda topilmadi. Sayt backend o‘zgarishlarini deploy qiling.`);
    }
    throw new Error(`Sayt API JSON emas javob qaytardi (HTTP ${response.status}, ${contentType || 'content-type yo‘q'}). ACADEMY_API_URL manzilini tekshiring.`);
  }

  try {
    data = JSON.parse(responseText) as { error?: string };
  } catch {
    throw new Error(`Sayt API noto‘g‘ri JSON qaytardi (HTTP ${response.status}).`);
  }
  if (!response.ok) throw new Error(data.error || `Akademiya API xatosi: ${response.status}`);
  return data;
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

export async function getAcademyBookText(bookId: number): Promise<{ title: string; text: string }> {
  const response = await sendAcademyRequest(`/api/bot/books/${bookId}`, {});
  const book = response as AcademyBook;
  const pdfUrl = new URL(book.pdfPath, `${config.academyApiUrl}/`);
  if (pdfUrl.origin !== new URL(config.academyApiUrl).origin) {
    throw new Error('Sayt kitobining PDF manzili noto‘g‘ri');
  }

  const pdfResponse = await fetch(pdfUrl);
  if (!pdfResponse.ok) {
    throw new Error(`Saytdagi kitob PDF fayli olinmadi (HTTP ${pdfResponse.status})`);
  }

  const text = await PdfBookService.extractTextFromBuffer(
    Buffer.from(await pdfResponse.arrayBuffer())
  );
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
  const pdfUrl = new URL(book.pdfPath, `${config.academyApiUrl}/`);
  if (pdfUrl.origin !== new URL(config.academyApiUrl).origin) {
    throw new Error('Sayt kitobining PDF manzili noto‘g‘ri');
  }

  const pdfResponse = await fetch(pdfUrl);
  if (!pdfResponse.ok) {
    throw new Error(`Guruh kitobining PDF fayli olinmadi (HTTP ${pdfResponse.status})`);
  }
  const text = await PdfBookService.extractTextFromBuffer(Buffer.from(await pdfResponse.arrayBuffer()));
  if (!text) throw new Error('Guruh kitobining PDF faylidan matn ajratib olinmadi');
  return { id: book.id, title: book.title, text };
}

export async function syncAcademyStats(): Promise<void> {
  const [users, groups, tests, gradedStudents] = await Promise.all([
    db.query("SELECT COUNT(*) AS count FROM users WHERE status = 'active'"),
    db.query('SELECT COUNT(*) AS count FROM groups WHERE is_active = TRUE'),
    db.query('SELECT COUNT(*) AS count FROM user_tests'),
    db.query('SELECT COUNT(*) AS count FROM users WHERE grade IS NOT NULL AND grade > 0'),
  ]);
  const count = (rows: Array<{ count: number | string }>) => Number(rows[0]?.count || 0);

  await sendAcademyRequest('/api/bot/stats', {
    users: count(users.rows),
    groups: count(groups.rows),
    tests: count(tests.rows),
    gradedStudents: count(gradedStudents.rows),
  });
}
