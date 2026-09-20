import express from 'express';
import * as productController from './controllers/products.js';
import * as cronController from './controllers/cron.js';

const router = express.Router();

// Product search and listing
router.get('/products/search', productController.searchProducts);
router.get('/tracked-products', productController.getTrackedProducts);
router.post('/tracked-products', productController.trackProduct);

// Tracked product details
router.get('/tracked-products/:id', productController.getTrackedProductDetail);
router.get('/tracked-products/:id/history', productController.getProductHistory);
router.get('/tracked-products/:id/logs', productController.getProductLogs);
router.post('/tracked-products/:id/scrape', productController.manualScrape);

// Cron trigger (supports both POST and GET for external cron services)
router.post('/scrape/run', cronController.runCronScrape);
router.get('/scrape/run', cronController.runCronScrape);

export default router;
