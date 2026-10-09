/**
 * Outbound HTTP for puzzle sources (Wikipedia, Wikimedia feeds, Lichess).
 *
 * Every request carries a descriptive User-Agent with a contact address —
 * Wikimedia's API policy requires one and blocks generic agents — and has a
 * hard timeout so a stalled source fails one attempt rather than the run.
 * Transient failures (network, 429, 5xx) are retried with backoff.
 */

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;

export function userAgent(env = process.env) {
  const contact = env.CONTACT_EMAIL?.trim() || 'https://thecrypticowl.com';
  return `TheCrypticOwl-PuzzleBot/1.0 (${contact})`;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

export class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export async function fetchJson(
  url,
  {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    headers = {},
    fetchImpl = fetch,
  } = {}
) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        headers: { 'User-Agent': userAgent(), Accept: 'application/json', ...headers },
        signal: controller.signal,
      });
      if (res.ok) return await res.json();
      const transient = res.status === 429 || res.status >= 500;
      lastErr = new HttpError(`GET ${url} → ${res.status}`, res.status);
      if (!transient) throw lastErr;
    } catch (err) {
      if (err instanceof HttpError && err.status < 500 && err.status !== 429) throw err;
      lastErr = err.name === 'AbortError' ? new HttpError(`GET ${url} timed out`, 0) : err;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) await sleep(500 * 2 ** attempt);
  }
  throw lastErr;
}
