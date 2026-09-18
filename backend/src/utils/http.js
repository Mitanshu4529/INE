import { config } from '../config.js';

export class HttpError extends Error {
  constructor(status, message, url) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
  }
}

export async function fetchJson(url, { timeoutMs = config.httpTimeoutMs, headers } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'INE-Price-Tracker/1.0',
        ...headers,
      },
    });
    const text = await response.text();
    const durationMs = Date.now() - started;
    if (!response.ok) {
      throw new HttpError(response.status, `HTTP ${response.status} for ${url}`, url);
    }
    try {
      return { data: JSON.parse(text), status: response.status, durationMs };
    } catch {
      throw new Error(`Invalid JSON from ${url}`);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeout = new Error(`Timeout after ${timeoutMs}ms requesting ${url}`);
      timeout.code = 'TIMEOUT';
      throw timeout;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function backoffDelay(attempt, baseMs = config.retryBaseDelayMs) {
  return baseMs * 2 ** (attempt - 1);
}
