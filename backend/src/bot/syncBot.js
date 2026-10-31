// backend/src/bot/syncBot.js
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Send student stats (or other payload) to the Academy API.
 * The request is protected by the `x-bot-sync-secret` header which must match
 * the value defined in `.env` (`BOT_SYNC_SECRET`).
 *
 * @param {Object} payload  The JSON payload to send to the Academy endpoint.
 * @returns {Promise<Object>} The parsed JSON response from the academy server.
 * @throws {Error} If the request fails or the server returns a non‑2xx status.
 */
export async function syncStudentStats(payload) {
  const apiUrl = process.env.ACADEMY_API_URL?.trim();
  if (!apiUrl) {
    throw new Error('ACADEMY_API_URL .env‑da belgilanmagan');
  }

  const secret = process.env.BOT_SYNC_SECRET?.trim();
  if (!secret) {
    throw new Error('BOT_SYNC_SECRET .env‑da belgilanmagan');
  }

  const endpoint = `${apiUrl.replace(/\/*$/, '')}/api/bot/student-stats`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bot-sync-secret': secret,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Bot sinxronlash xatosi ${response.status}: ${text}`);
  }

  return await response.json();
}
