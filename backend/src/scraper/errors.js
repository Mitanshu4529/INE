export class ScrapeError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = 'ScrapeError';
    this.code = code;
    this.retryable = extra.retryable !== false;
    this.httpStatus = extra.httpStatus ?? null;
    this.details = extra.details ?? null;
  }
}

export const ScrapeCodes = {
  TIMEOUT: 'timeout',
  HTTP_ERROR: 'http_error',
  NETWORK: 'network_failure',
  MISSING_SELECTOR: 'missing_selector',
  MISSING_PRICE: 'missing_price',
  INVALID_PRICE: 'invalid_price',
  MISSING_STOCK: 'missing_stock',
  INVALID_STOCK: 'invalid_stock',
  IDENTITY: 'product_identity_mismatch',
  STRUCTURE: 'unexpected_page_structure',
  CHALLENGE: 'challenge_failed',
  BROWSER: 'browser_failure',
  SIMULATED: 'simulated_failure',
};
