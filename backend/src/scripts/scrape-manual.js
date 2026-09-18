import { scrapeProduct, closeBrowser } from '../scraper/scraper.js';
import { catalogService } from '../services/catalog.js';
import { logger } from '../utils/logger.js';

async function main() {
  const args = process.argv.slice(2);
  const targetId = args[0] ? Number(args[0]) : null;

  try {
    logger.info('Manual Scraper: Fetching catalog to identify products...');
    const catalog = await catalogService.getCatalog();

    let productToScrape = null;

    if (targetId) {
      productToScrape = catalog.find(p => p.id === targetId);
      if (!productToScrape) {
        logger.error(`Manual Scraper: Product with ID ${targetId} not found in catalog.`);
        process.exit(1);
      }
    } else {
      // Pick a default product from the catalog if none supplied (e.g. the first one)
      productToScrape = catalog.find(p => p.id === 1) || catalog[0];
      if (!productToScrape) {
        logger.error('Manual Scraper: No products found in catalog.');
        process.exit(1);
      }
      logger.info(`Manual Scraper: No product ID specified. Defaulting to first product: "${productToScrape.name}" (ID: ${productToScrape.id})`);
    }

    logger.info(`Manual Scraper: Starting scrape for "${productToScrape.name}" (ID: ${productToScrape.id})`);
    const result = await scrapeProduct(productToScrape.id, productToScrape.name);

    if (result.success) {
      console.log('\n=========================================');
      console.log('       SCRAPE SUCCESSFUL                 ');
      console.log('=========================================');
      console.log(`Product:    ${result.data.name}`);
      console.log(`ID:         ${result.data.productId}`);
      console.log(`Price:      $${result.data.price}`);
      console.log(`Stock:      ${result.data.stock}`);
      console.log(`Duration:   ${result.data.durationMs}ms`);
      console.log(`Attempts:   ${result.attempts}`);
      console.log('=========================================\n');
    } else {
      console.log('\n=========================================');
      console.log('       SCRAPE FAILED                     ');
      console.log('=========================================');
      console.log(`Error:      ${result.error.message}`);
      console.log(`Code:       ${result.error.code}`);
      console.log(`HTTP Code:  ${result.error.httpStatus ?? 'N/A'}`);
      console.log(`Attempts:   ${result.attempts}`);
      console.log('=========================================\n');
    }
  } catch (err) {
    logger.error(`Manual Scraper: Unexpected error: ${err.message}`);
  } finally {
    await closeBrowser();
  }
}

main();
