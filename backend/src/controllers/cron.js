import { scraperService } from '../services/scraper.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export const runCronScrape = async (req, res) => {
  const secret = req.headers['x-cron-secret'];

  if (!config.cronSecret || secret !== config.cronSecret) {
    logger.warn(`API: Unauthorized cron attempt from ${req.ip}`);
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  logger.info('API: Cron scrape triggered');

  // Start the scrape process in the background
  scraperService.runAll()
    .then(result => {
      logger.info('API: Cron scrape batch finished');
    })
    .catch(err => {
      logger.error(`API: Cron scrape batch failed: ${err.message}`);
    });

  // Return immediately so the cron service doesn't timeout
  res.json({
    success: true,
    message: 'Scrape process started in background'
  });
};
