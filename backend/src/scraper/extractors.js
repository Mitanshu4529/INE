const FULLWIDTH_ZERO = '０'.charCodeAt(0);

export function stripInvisible(text) {
  return String(text ?? '')
    .replace(/[​‌‍﻿]/g, '')
    .replace(/ /g, ' ');
}

export function normalizeFullwidthDigits(text) {
  return String(text).replace(/[０-９]/g, (ch) => String(ch.charCodeAt(0) - FULLWIDTH_ZERO));
}

/**
 * Parse a visible store price string into a finite number.
 * The store formats prices several ways (split characters, fullwidth
 * digits, Indian grouping, euro-like grouping, "Rs." prefix).
 */
export function parsePriceText(raw) {
  if (raw == null) return { ok: false, reason: 'missing_price', value: null, raw };
  let s = normalizeFullwidthDigits(stripInvisible(raw)).trim();
  if (!s) return { ok: false, reason: 'empty_price', value: null, raw };

  s = s
    .replace(/\/-\s*\(incl\.?\s*of all taxes\)/i, '')
    .replace(/INR/gi, '')
    .replace(/Rs\.?/gi, '')
    .replace(/₹/g, '')
    .trim();

  const compact = s.replace(/\s+/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d{2})?$/.test(compact)) {
    s = compact.replace(/\./g, '').replace(',', '.');
  } else {
    s = compact.replace(/,/g, '');
  }

  const match = s.match(/-?\d+(\.\d+)?/);
  if (!match) return { ok: false, reason: 'unparseable_price', value: null, raw };

  const value = Number(match[0]);
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return { ok: false, reason: 'non_finite_price', value: null, raw };
  }
  return { ok: true, value, raw };
}

export function parseStockText(raw) {
  if (raw == null) return { ok: false, reason: 'missing_stock', value: null, raw };
  const s = stripInvisible(raw).trim();
  if (!s) return { ok: false, reason: 'empty_stock', value: null, raw };
  if (/out of stock/i.test(s)) return { ok: true, value: 0, raw };
  const match = s.match(/(\d+)/);
  if (!match) return { ok: false, reason: 'unparseable_stock', value: null, raw };
  const value = Number(match[1]);
  if (!Number.isInteger(value) || value < 0) {
    return { ok: false, reason: 'invalid_stock', value: null, raw };
  }
  return { ok: true, value, raw };
}

export function namesMatch(expected, actual) {
  const a = stripInvisible(expected).replace(/\s+/g, ' ').trim().toLowerCase();
  const b = stripInvisible(actual).replace(/\s+/g, ' ').trim().toLowerCase();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}
