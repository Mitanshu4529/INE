import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function num(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function bool(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).toLowerCase());
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: num('PORT', 3001),
  mockStoreUrl: (process.env.MOCK_STORE_URL || 'https://demo.inelabteamdev.com').replace(/\/$/, ''),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  cronSecret: process.env.CRON_SECRET || '',
  manualScrapeSecret: process.env.MANUAL_SCRAPE_SECRET || '',
  navigationTimeoutMs: num('SCRAPE_NAVIGATION_TIMEOUT_MS', 20000),
  revealTimeoutMs: num('SCRAPE_REVEAL_TIMEOUT_MS', 25000),
  maxRetries: num('SCRAPE_MAX_RETRIES', 3),
  retryBaseDelayMs: num('SCRAPE_RETRY_BASE_DELAY_MS', 1000),
  httpTimeoutMs: num('HTTP_TIMEOUT_MS', 12000),
  headed: bool('HEADED', false),
  slowMoMs: num('SLOW_MO_MS', 0),
  simulate: process.env.SCRAPE_SIMULATE || 'none',
  catalogTtlMs: num('CATALOG_TTL_MS', 10 * 60 * 1000),
  catalogPageSize: num('CATALOG_PAGE_SIZE', 50),
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  dataDir: path.resolve(__dirname, '../data'),
};

export function usesSupabase() {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
}
