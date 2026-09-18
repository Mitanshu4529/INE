export function validatePrice(price) {
  if (price === null || price === undefined || price === '') {
    return { ok: false, reason: 'missing_price' };
  }
  if (typeof price !== 'number' || Number.isNaN(price) || !Number.isFinite(price)) {
    return { ok: false, reason: 'invalid_price' };
  }
  if (price < 0) return { ok: false, reason: 'negative_price' };
  return { ok: true };
}

export function validateStock(stock) {
  if (stock === null || stock === undefined || stock === '') {
    return { ok: false, reason: 'missing_stock' };
  }
  if (typeof stock !== 'number' || Number.isNaN(stock) || !Number.isFinite(stock)) {
    return { ok: false, reason: 'invalid_stock' };
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return { ok: false, reason: 'invalid_stock' };
  }
  return { ok: true };
}

export function validateScrapeResult(result, expected = {}) {
  if (!result) return { ok: false, reason: 'empty_result' };

  if (expected.productId != null && Number(result.productId) !== Number(expected.productId)) {
    return { ok: false, reason: 'product_identity_mismatch' };
  }
  if (expected.name && result.name) {
    const a = expected.name.trim().toLowerCase();
    const b = result.name.trim().toLowerCase();
    if (a !== b && !a.includes(b) && !b.includes(a)) {
      return { ok: false, reason: 'product_name_mismatch' };
    }
  }

  const priceCheck = validatePrice(result.price);
  if (!priceCheck.ok) return priceCheck;
  const stockCheck = validateStock(result.stock);
  if (!stockCheck.ok) return stockCheck;

  return { ok: true };
}
