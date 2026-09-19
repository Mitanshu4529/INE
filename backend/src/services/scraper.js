import { scrapeProduct, closeBrowser } from '../scraper/scraper.js';
import { db } from '../database/client.js';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';

class ScraperService {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Run a scrape for a single tracked product
   */
  async runSingle(trackedProduct) {
    const started = Date.now();
    logger.info(`Scraper: Starting run for ${trackedProduct.product_name} (${trackedProduct.product_id})`);

    try {
      const result = await scrapeProduct(trackedProduct.product_id, trackedProduct.product_name);

      if (result.success) {
        const { price, stock, durationMs } = result.data;

        // Transactional update: update current values and add to history
        await db.updateProductPrice(trackedProduct.id, price, stock);
        await db.addPriceHistory(trackedProduct.id, price, stock);

        // Log success
        await db.addScrapeLog({
          tracked_product_id: trackedProduct.id,
          status: 'SUCCESS',
          attempt_number: result.attempts,
          duration_ms: durationMs,
          details: { variant: result.data.variant }
        });

        logger.info(`Scraper: Successfully updated ${trackedProduct.product_name}. Price: ${price}, Stock: ${stock}`);
        return { success: true, data: result.data };
      } else {
        // Log failure
        await db.addScrapeLog({
          tracked_product_id: trackedProduct.id,
          status: 'FAILED',
          attempt_number: result.attempts,
          error_message: result.error.message,
          http_status: result.error.httpStatus,
          details: result.error.details
        });

        logger.error(`Scraper: Failed to scrape ${trackedProduct.product_name}: ${result.error.message}`);
        return { success: false, error: result.error };
      }
    } catch (err) {
      logger.error(`Scraper: Unexpected error during ${trackedProduct.product_name} scrape: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Run a scrape for all tracked products
   */
  async runAll({ limit = Infinity, onlyMissing = false } = {}) {
    if (this.isRunning) {
      logger.warn('Scraper: A full run is already in progress. Skipping.');
      return { success: false, error: 'Already running' };
    }

    this.isRunning = true;
    const summary = { total: 0, success: 0, failed: 0, startedAt: new Date().toISOString() };

    try {
      const products = await db.getTrackedProducts();
      const activeProducts = products
        .filter(p => p.tracking_status && (!onlyMissing || p.current_price == null || p.current_stock == null))
        .slice(0, limit);
      summary.total = activeProducts.length;

      logger.info(`Scraper: Starting batch run for ${activeProducts.length} active products`);

      for (const product of activeProducts) {
        const result = await this.runSingle(product);
        if (result.success) summary.success++;
        else summary.failed++;

        // Add a small delay between products to be respectful to the store
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      logger.info(`Scraper: Batch run complete. Success: ${summary.success}, Failed: ${summary.failed}`);
      return { success: true, summary };
    } catch (err) {
      logger.error(`Scraper: Batch run failed: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      this.isRunning = false;
      await closeBrowser(); // Clean up browser after batch run
    }
  }
}

export const scraperService = new ScraperService();
