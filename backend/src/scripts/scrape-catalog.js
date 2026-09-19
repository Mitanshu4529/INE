import { catalogService } from '../services/catalog.js';
import { scraperService } from '../services/scraper.js';
import { db } from '../database/client.js';
import { closeBrowser } from '../scraper/scraper.js';
import { logger } from '../utils/logger.js';

function option(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find(argument => argument.startsWith(prefix));
  return value ? Number(value.slice(prefix.length)) : fallback;
}

async function main() {
  const seedLimit = option('seed-limit', Infinity);
  const scrapeLimit = option('scrape-limit', seedLimit);
  const catalog = await catalogService.getCatalog();
  const products = Number.isFinite(seedLimit) ? catalog.slice(0, seedLimit) : catalog;
  let seeded = 0;

  for (const product of products) {
    const existing = await db.findProductByStoreId(product.id);
    if (!existing) {
      await db.addTrackedProduct(product);
      seeded++;
    }
  }

  logger.info(`Catalog batch: seeded ${seeded} new products; scraping up to ${scrapeLimit}`);
  const result = await scraperService.runAll({ limit: scrapeLimit, onlyMissing: true });
  console.log(JSON.stringify({ seeded, result }, null, 2));
}

main()
  .catch(error => {
    logger.error(`Catalog batch failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => closeBrowser());