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

function getAcademyApiUrl(): URL {
  if (!config.academyApiUrl) {
    throw new Error('ACADEMY_API_URL sozlanmagan');
  }

  let apiUrl: URL;
  try {
    apiUrl = new URL(config.academyApiUrl);
  } catch {
    throw new Error('ACADEMY_API_URL to‘liq va to‘g‘ri URL bo‘lishi kerak');
  }
  if (!['http:', 'https:'].includes(apiUrl.protocol)) {
    throw new Error('ACADEMY_API_URL http:// yoki https:// bilan boshlanishi kerak');
  }
  if (process.env.NODE_ENV === 'production' && (
    apiUrl.protocol !== 'https:' ||
    ['localhost', '127.0.0.1'].includes(apiUrl.hostname)
  )) {
    throw new Error('Production muhitida ACADEMY_API_URL HTTPS saytingiz manzili bo‘lishi kerak');
  }
  return apiUrl;
}

async function sendAcademyRequest(path: string, payload: Record<string, unknown>): Promise<unknown> {
  const secret = config.academySyncSecret;
  if (!secret) {
    throw new Error('BOT_SYNC_SECRET yoki ACADEMY_SYNC_SECRET sozlanmagan');
  }

  const apiUrl = getAcademyApiUrl();
  const endpointUrl = new URL(path.replace(/^\/+/, ''), `${apiUrl.origin}/`);
  let response: Response;
  try {
    response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-sync-secret': secret,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'noma’lum tarmoq xatosi';
    throw new Error(`${apiUrl.host} saytiga ulanish amalga oshmadi (${reason})`);
  }

  const responseText = await response.text();
  let data: { error?: string };
  try {
    data = JSON.parse(responseText) as { error?: string };
  } catch {
    throw new Error(`${apiUrl.host} sayt API JSON bo‘lmagan javob qaytardi (HTTP ${response.status})`);
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        `${apiUrl.host} bot so‘rovini rad etdi (HTTP 401). Sayt va botdagi BOT_SYNC_SECRET qiymatlari bir xil ekanini tekshiring.`,
      );
    }
    if (response.status === 503) {
      throw new Error(`${apiUrl.host} saytida BOT_SYNC_SECRET sozlanmagan (HTTP 503)`);
    }
    throw new Error(data.error || `Sayt API xatosi (HTTP ${response.status})`);
  }

  return data;
}

async function fetchPdfBuffer(pdfPath: string): Promise<Buffer> {
  const apiUrl = getAcademyApiUrl();
  const targetUrl = new URL(pdfPath, `${apiUrl.origin}/`);
  if (targetUrl.origin !== apiUrl.origin) {
    throw new Error('Sayt kitobining PDF manzili noto‘g‘ri hostga yo‘naltirildi');
  }

  let response: Response;
  try {
    response = await fetch(targetUrl, { signal: AbortSignal.timeout(15000) });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'noma’lum tarmoq xatosi';
    throw new Error(`Kitob PDF fayliga ulanish amalga oshmadi (${reason})`);
  }
  if (!response.ok) {
    throw new Error(`Kitob PDF fayli olinmadi (HTTP ${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
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
