import { catalogService } from '../services/catalog.js';
import { db } from '../database/client.js';
import { scraperService } from '../services/scraper.js';
import { logger } from '../utils/logger.js';

export const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    const results = await catalogService.search(q);
    res.json({ success: true, data: results });
  } catch (err) {
    logger.error(`API: Search failed: ${err.message}`);
    res.status(500).json({ success: false, error: 'Failed to search products' });
  }
};

export const getTrackedProducts = async (req, res) => {
  try {
    const products = await db.getTrackedProducts();
    res.json({ success: true, data: products });
  } catch (err) {
    logger.error(`API: Get tracked products failed: ${err.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch tracked products' });
  }
};

export const trackProduct = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID is required' });
    }

    // Check if already tracking
    const existing = await db.findProductByStoreId(productId);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Product is already being tracked' });
    }

    // Get full product info from catalog
    const product = await catalogService.getById(productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found in catalog' });
    }

    const newTracked = await db.addTrackedProduct(product);

    // Trigger initial scrape in background
    scraperService.runSingle(newTracked).catch(err => {
      logger.error(`API: Initial scrape failed for ${product.name}: ${err.message}`);
    });

    res.status(201).json({ success: true, data: newTracked });
  } catch (err) {
    logger.error(`API: Track product failed: ${err.message}`);
    res.status(500).json({ success: false, error: 'Failed to track product' });
  }
};

export const getTrackedProductDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await db.getTrackedProduct(id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Tracked product not found' });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    logger.error(`API: Get product detail failed: ${err.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch product detail' });
  }
};

export const getProductHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await db.getPriceHistory(id);
    res.json({ success: true, data: history });
  } catch (err) {
    logger.error(`API: Get product history failed: ${err.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch price history' });
  }
};

export const getProductLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await db.getScrapeLogs(id);
    res.json({ success: true, data: logs });
  } catch (err) {
    logger.error(`API: Get product logs failed: ${err.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch scrape logs' });
  }
};

export const manualScrape = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await db.getTrackedProduct(id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Tracked product not found' });
    }

    // Run scrape (do not wait if it's a long process, but for single product we can wait a bit)
    const result = await scraperService.runSingle(product);
    res.json(result);
  } catch (err) {
    logger.error(`API: Manual scrape failed: ${err.message}`);
    res.status(500).json({ success: false, error: 'Failed to trigger scrape' });
  }
};
