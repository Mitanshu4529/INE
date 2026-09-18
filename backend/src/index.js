import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import routes from './routes.js';
import { catalogService } from './services/catalog.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled Error: ${err.message}`);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// Start server
const start = async () => {
  try {
    // Initial catalog load
    await catalogService.refreshCatalog();

    app.listen(config.port, () => {
      logger.info(`Server: Backend running on port ${config.port}`);
      logger.info(`Server: Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    logger.error(`Server: Failed to start: ${err.message}`);
    process.exit(1);
  }
};

start();
