import { chromium } from 'playwright';
import { config } from '../config.js';
import { fetchJson, sleep, backoffDelay } from '../utils/http.js';
import { ScrapeError, ScrapeCodes } from './errors.js';
import { parsePriceText, parseStockText, namesMatch, stripInvisible } from './extractors.js';
import { validateScrapeResult } from './validators.js';
import { scrapeLog } from '../utils/logger.js';

let _browser = null;

// Ensure PLAYWRIGHT_BROWSERS_PATH is 0 if not set in production
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && process.env.NODE_ENV === 'production') {
  process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
}

async function getBrowser() {
  if (!_browser || !_browser.isConnected()) {
    scrapeLog('Launching browser', config.headed ? '(headed)' : '(headless)');
    _browser = await chromium.launch({
      headless: !config.headed,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
      ],
      slowMo: config.slowMoMs,
    });
  }
  return _browser;
}

export async function closeBrowser() {
  if (_browser && _browser.isConnected()) {
    await _browser.close();
    _browser = null;
    scrapeLog('Browser closed');
  }
}

async function fetchLayout() {
  const url = `${config.mockStoreUrl}/api/layout`;
  const { data } = await fetchJson(url);
  return data;
}

async function hoverAndReveal(page, layout, productId) {
  const selector = '.price-block';
  await page.waitForSelector(selector, { timeout: 12000 });

  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new ScrapeError(ScrapeCodes.MISSING_SELECTOR, 'Price block has no bounding box');

  scrapeLog(`Hovering over price area (${Math.round(box.width)}x${Math.round(box.height)})`);

  // Minimum 16 movements, spaced 65ms apart to comfortably exceed store's 40ms tracking threshold
  const moves = 16;
  for (let i = 0; i < moves; i++) {
    const x = box.x + 20 + (i * (box.width - 40)) / moves + (Math.random() * 4 - 2);
    const y = box.y + box.height * (0.3 + Math.random() * 0.4);
    await page.mouse.move(x, y);
    await sleep(65);
  }

  // Ensure minimum dwell time (> 600ms requirement)
  await sleep(850);

  const buttonSelector = 'button[aria-label*="Reveal"], button:has-text("Reveal price"), .price-block button';
  const button = page.locator(buttonSelector).first();

  // The store wraps the click handler in a 35% flaky wrapper (Xn) which sometimes drops clicks.
  // We click with retry until revealed state (.price-success or .price-main) is triggered.
  const maxClickAttempts = 5;
  for (let clickAttempt = 1; clickAttempt <= maxClickAttempts; clickAttempt++) {
    const isSuccess = await page.locator('.price-success, .price-main').isVisible().catch(() => false);
    if (isSuccess) break;

    const isVisible = await button.isVisible({ timeout: 1500 }).catch(() => false);
    if (!isVisible) break;

    const isDisabled = await button.getAttribute('disabled').catch(() => null);
    if (isDisabled !== null && isDisabled !== undefined) {
      scrapeLog(`Button disabled on attempt ${clickAttempt}, moving mouse to satisfy dwell/move requirement`);
      for (let j = 0; j < 8; j++) {
        const x = box.x + 25 + (j * (box.width - 50)) / 8;
        const y = box.y + box.height * 0.5;
        await page.mouse.move(x, y);
        await sleep(65);
      }
      await sleep(700);
    }

    scrapeLog(`Clicking reveal button (attempt ${clickAttempt}/${maxClickAttempts})`);
    await button.click({ timeout: 2000 }).catch(() => {});

    await sleep(1500);

    const hasRevealed = await page.locator('.price-success, .price-main').isVisible().catch(() => false);
    if (hasRevealed) {
      scrapeLog('Reveal request triggered successfully');
      break;
    }
  }

  scrapeLog('Waiting for price element to render...');
  await page.waitForSelector('.price-success, .price-main', { timeout: config.revealTimeoutMs });
  await sleep(400);
}

async function extractPriceAndStock(page, layout) {
  // Extract visible price text from .price-main (ignoring display:none decoys and line-through MRP)
  let priceText = await page.evaluate(() => {
    const priceMain = document.querySelector('.price-main');
    if (!priceMain) return null;

    const elements = Array.from(priceMain.querySelectorAll('b, span, div'));
    for (const el of elements) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if (el.getAttribute('aria-hidden') === 'true') continue;
      if (style.textDecoration.includes('line-through')) continue;
      const text = (el.textContent || '').trim();
      if (text.includes('% off') || text.includes('Deal price') || text.includes('Updating')) continue;
      if (text.includes('₹') || text.includes('Rs') || /\d/.test(text)) {
        return text;
      }
    }
    return priceMain.textContent;
  }).catch(() => null);

  if (!priceText) {
    const classes = layout.classes || {};
    const priceValueClass = classes.priceValue;
    if (priceValueClass) {
      priceText = await page.locator(`.${priceValueClass}`).first().textContent({ timeout: 2000 }).catch(() => null);
    }
  }

  // Extract stock text
  let stockText = await page.evaluate(() => {
    const stockEl = document.querySelector('.stock-badge, [class*="stock"], .price-facets');
    if (stockEl) return stockEl.textContent;
    return null;
  }).catch(() => null);

  if (!stockText) {
    const classes = layout.classes || {};
    const stockClass = classes.stock || 'stock';
    stockText = await page.locator(`.${stockClass}`).first().textContent({ timeout: 2000 }).catch(() => null);
  }

  const priceResult = parsePriceText(priceText);
  const stockResult = parseStockText(stockText);

  if (!priceResult.ok) {
    throw new ScrapeError(ScrapeCodes.INVALID_PRICE, priceResult.reason, {
      details: { raw: priceText, reason: priceResult.reason },
    });
  }
  if (!stockResult.ok) {
    throw new ScrapeError(ScrapeCodes.INVALID_STOCK, stockResult.reason, {
      details: { raw: stockText, reason: stockResult.reason },
    });
  }

  return { price: priceResult.value, stock: stockResult.value };
}

async function scrapeProductOnce(productId, expectedName, attemptNumber) {
  scrapeLog(`[ATTEMPT ${attemptNumber}] Product ${productId}`);
  const started = Date.now();

  if (config.simulate === 'timeout' && attemptNumber === 1) {
    scrapeLog('[SIMULATE] Injecting timeout');
    await sleep(config.navigationTimeoutMs + 1000);
    throw new ScrapeError(ScrapeCodes.SIMULATED, 'Simulated timeout');
  }

  if (config.simulate === 'http-error' && attemptNumber === 1) {
    scrapeLog('[SIMULATE] Injecting HTTP error');
    throw new ScrapeError(ScrapeCodes.HTTP_ERROR, 'Simulated HTTP 500', {
      httpStatus: 500,
      retryable: true,
    });
  }

  if (config.simulate === 'fail') {
    throw new ScrapeError(ScrapeCodes.SIMULATED, 'Simulated permanent failure', {
      retryable: false,
    });
  }

  const layout = await fetchLayout();
  scrapeLog(`Layout variant=${layout.variant} revision=${layout.revision}`);

  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const url = `${config.mockStoreUrl}/product/${productId}`;
    scrapeLog(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.navigationTimeoutMs });

    const titleText = await page.locator('h1').first().textContent({ timeout: 5000 });
    const actualName = stripInvisible(titleText || '').trim();
    scrapeLog(`Page title: ${actualName}`);

    if (expectedName && !namesMatch(expectedName, actualName)) {
      throw new ScrapeError(ScrapeCodes.IDENTITY, 'Product name mismatch', {
        details: { expected: expectedName, actual: actualName },
        retryable: false,
      });
    }

    await hoverAndReveal(page, layout, productId);
    const { price, stock } = await extractPriceAndStock(page, layout);
    const durationMs = Date.now() - started;

    scrapeLog(`[SUCCESS] Price=${price} Stock=${stock} Duration=${durationMs}ms`);
    return { productId, name: actualName, price, stock, durationMs };
  } finally {
    await context.close();
  }
}

export async function scrapeProduct(productId, expectedName) {
  const maxRetries = config.maxRetries;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await scrapeProductOnce(productId, expectedName, attempt);
      const validation = validateScrapeResult(result, { productId, name: expectedName });
      if (!validation.ok) {
        throw new ScrapeError(ScrapeCodes.STRUCTURE, validation.reason, {
          details: { result, validation },
          retryable: attempt < maxRetries,
        });
      }
      return { success: true, data: result, attempts: attempt };
    } catch (error) {
      lastError = error;
      const retryable = error.retryable !== false;
      const shouldRetry = retryable && attempt < maxRetries;

      scrapeLog(
        `[${shouldRetry ? 'RETRYING' : 'FAILED'}] Attempt ${attempt}/${maxRetries}: ${error.message}`
      );

      if (shouldRetry) {
        const delayMs = backoffDelay(attempt);
        scrapeLog(`Waiting ${delayMs}ms before retry`);
        await sleep(delayMs);
      } else {
        break;
      }
    }
  }

  return {
    success: false,
    error: {
      message: lastError.message,
      code: lastError.code || 'unknown',
      httpStatus: lastError.httpStatus ?? null,
      details: lastError.details ?? null,
    },
    attempts: maxRetries,
  };
}
