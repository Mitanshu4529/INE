import { scraperService } from '../services/scraper.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export const runCronScrape = async (req, res) => {
  const secret = req.headers['x-cron-secret'] || req.query.secret;

  if (!config.cronSecret || secret !== config.cronSecret) {
    logger.warn(`API: Unauthorized cron attempt from ${req.ip}`);
    return res.status(401).type('text/plain').send('Unauthorized');
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

  // Return minimal response immediately so external cron service never timeouts or exceeds payload limits
  res.status(200).type('text/plain').send('OK');
};
