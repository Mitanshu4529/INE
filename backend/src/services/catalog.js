import { fetchJson, sleep } from '../utils/http.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { stripInvisible } from '../scraper/extractors.js';

class CatalogService {
  constructor() {
    this.catalog = [];
    this.lastFetched = null;
    this.isFetching = false;
  }

  async getCatalog() {
    if (this.catalog.length > 0 && this.lastFetched && (Date.now() - this.lastFetched < 3600000)) {
      return this.catalog;
    }
    return this.refreshCatalog();
  }

  async refreshCatalog() {
    if (this.isFetching) {
      while (this.isFetching) {
        await sleep(100);
      }
      return this.catalog;
    }

    this.isFetching = true;
    try {
      logger.info('Catalog: Fetching all pages from store...');
      let allItems = [];
      let page = 1;
      let totalPages = 1;

      do {
        logger.info(`Catalog: Fetching page ${page}...`);
        const url = `${config.mockStoreUrl}/api/catalog?pageSize=60&page=${page}`;
        // CRITICAL FIX: fetchJson returns { data: ..., status: ..., durationMs: ... }
        // Our previous code expected `response` to be the data itself.
        const response = await fetchJson(url);
        const data = response.data; // Correctly access the data

        if (data && data.items && Array.isArray(data.items)) {
          allItems = allItems.concat(data.items);
          totalPages = data.pages;
          page++;
        } else {
          throw new Error('Invalid catalog data received');
        }
        // Small delay between requests to be gentle
        await sleep(200);
      } while (page <= totalPages);

      this.catalog = allItems.map(p => ({
        ...p,
        name_normalized: stripInvisible(p.name).toLowerCase(),
        brand_normalized: stripInvisible(p.brand || '').toLowerCase(),
        sku_normalized: stripInvisible(p.sku || '').toLowerCase()
      }));
      this.lastFetched = Date.now();
      logger.info(`Catalog: Successfully loaded ${this.catalog.length} products`);
    } catch (err) {
      logger.error(`Catalog: Failed to fetch: ${err.message}`);
    } finally {
      this.isFetching = false;
    }
    return this.catalog;
  }

  async search(query) {
    const products = await this.getCatalog();
    if (!query) return products.slice(0, 50);

    const q = stripInvisible(query).toLowerCase().trim();
    return products.filter(p =>
      p.name_normalized.includes(q) ||
      p.brand_normalized.includes(q) ||
      p.sku_normalized.includes(q) ||
      String(p.id).includes(q)
    ).slice(0, 50);
  }

  async getById(id) {
    const products = await this.getCatalog();
    return products.find(p => p.id === Number(id));
  }
}

export const catalogService = new CatalogService();
