# INE Store Price Tracker

A production-quality price tracker for the INE mock store with reliable web scraping that survives failures, retries, and unattended runs without storing invalid data.

## Features

- **Reliable Scraping**: Playwright-based scraper that handles anti-scraping measures requiring human-like hover interaction
- **Dual Database Support**: Supabase for production, local JSON fallback for development
- **Structured Logging**: Comprehensive audit trail of all scrape attempts (SUCCESS/RETRYING/FAILED)
- **External Scheduling**: cron-job.org triggers scraping every 2 hours (no backend process required)
- **Search & Tracking**: Full-text search of product catalog with tracking capability
- **Historical Data**: Price and stock history with visualization
- **Manual Scrape**: On-demand scraping for testing and debugging
- **Frontend Dashboard**: React + Vite interface for viewing tracked products, history, and logs

## Architecture

- **Frontend**: React.js with Vite, deployed to Vercel
- **Backend**: Node.js + Express.js, deployed to Render  
- **Database**: Supabase PostgreSQL
- **Scraping**: Playwright for product pages (price/stock), HTTP for catalog/search
- **Scheduling**: External cron-job.org calling a protected backend endpoint

## Prerequisites

- Node.js 18+
- npm or yarn
- Git
- Supabase account (for production)
- Render account (for backend deployment)
- Vercel account (for frontend deployment)
- cron-job.org account (for scheduling)

## Local Development Setup

1. Clone the repository
```bash
git clone <your-repo-url>
cd INE-assignment
```

2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration (see below)
npm run dev
```

3. Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env
# Edit .env with your configuration (see below)
npm run dev
```

4. Visit http://localhost:5173 to use the application

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=random_strong_secret
SCRAPE_NAVIGATION_TIMEOUT=15000
SCRAPE_HOVER_TIMEOUT=10000
SCRAPE_RETRY_BASE_DELAY=300
SCRAPE_MAX_RETRIES=6
MOCK_STORE_URL=https://demo.inelabteamdev.com
HEADED=false
SLOW_MO_MS=0
SCRAPE_SIMULATE=none
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:3001/api
```

## Database Schema

The application uses three main tables:

1. `tracked_products` - Stores tracked product information
2. `price_history` - Historical price and stock data 
3. `scrape_logs` - Audit trail of all scrape attempts

See `database/schema.sql` for the complete schema definition.

## Deployment

### Backend (Render)
1. Push code to GitHub
2. Import repository to Render as a Web Service
3. Set environment variables in Render dashboard
4. Deploy

### Frontend (Vercel)
1. Push code to GitHub
2. Import repository to Vercel
3. Set `VITE_API_BASE_URL` environment variable to your backend URL
4. Deploy

### Scheduling (cron-job.org)
1. Create account at cron-job.org
2. Create new job:
   - URL: `https://your-backend.onrender.com/api/scrape/run`
   - Method: POST
   - Header: `X-Cron-Secret: <your_cron_secret>`
   - Schedule: `0 */2 * * *` (every 2 hours)

## API Endpoints

### Public Endpoints
- `GET /api/products/search?q=` - Search products
- `GET /api/tracked-products` - List tracked products
- `POST /api/tracked-products` - Track a new product
- `GET /api/tracked-products/:id` - Get tracked product detail
- `GET /api/tracked-products/:id/history` - Price/stock history
- `GET /api/tracked-products/:id/logs` - Scrape attempt logs
- `POST /api/tracked-products/:id/scrape` - Manual scrape
- `POST /api/scrape/run` - Cron-triggered scrape (protected)

## Testing & Verification

### Manual Verification Checklist
- [ ] Product search returns results for known products
- [ ] Tracking same product twice returns existing record
- [ ] Manual scrape succeeds and inserts valid price/stock
- [ ] Manual scrape on non-existent product fails gracefully
- [ ] Price/stock history only grows on successful scrapes
- [ ] Scrape logs capture every attempt with status
- [ ] Failed attempts do NOT corrupt current values
- [ ] Layout fetch occurs before each product scrape
- [ ] Hover behavior visible in headed mode
- [ ] Retry attempts spaced with backoff
- [ ] Cron endpoint returns 401 without/with wrong secret
- [ ] Frontend displays history chart/table
- [ ] Frontend displays logs with timestamps and reasons
- [ ] Empty states shown when no data
- [ ] Error states shown on API failure
- [ ] Loading states shown during search/scrape

## Development Scripts

### Backend
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run scrape:headed` - Run headed scraper for debugging
- `npm run scrape:demo` - Run headed scraper with slowed motions

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Project Structure

```
backend/
├── src/
│   ├── config.js              # Configuration loader
│   ├── utils/                 # Utility functions (logger, http)
│   ├── database/              # Database client (Supabase + local fallback)
│   ├── scraper/               # Playwright scraping logic
│   │   ├── extractors.js      # Price/stock parsing
│   │   ├── validators.js      # Data validation
│   │   ├── errors.js          # Custom error classes
│   │   └── scraper.js         # Main Playwright orchestrator
│   ├── services/              # Business logic services
│   │   ├── catalog.js         # Product catalog service
│   │   └── scraper.js         # Scrape orchestration service
│   ├── controllers/           # API controllers
│   │   ├── products.js        # Product-related endpoints
│   │   └── cron.js            # Cron-triggered scrape endpoint
│   ├── routes.js              # API route definitions
│   └── index.js               # Application entrypoint
frontend/
├── src/
│   ├── api.js                 # API service wrapper
│   ├── components/            # Reusable components
│   │   └── Navbar.jsx         # Navigation component
│   ├── pages/                 # Page components
│   │   ├── Search.jsx         # Product search page
│   │   ├── Dashboard.jsx      # Tracked products list
│   │   └── ProductDetail.jsx  # Product detail with history/logs
│   ├── App.jsx                # Main application component
│   └── index.css              # Global styles (with Tailwind)
```

## Known Limitations

- Search relies on caching full catalog (~1000 products)
- Headed mode requires local Playwright installation
- Price validation assumes Br(e) transformation is constant

## Interview Preparation Points

### Scraper
- What it does: Automates product page interaction to extract price/stock via Playwright
- Why exists: Store hides data behind challenge-response requiring mouse movement
- What could fail: Network, timeout, validation, fingerprint mismatch
- How it handles failure: Retries with backoff, logs attempt, never stores invalid data

### Retry Mechanism
- What it does: Re-attempts scrape with increasing delays after failures
- Why exists: Store has intermittent slow responses/errors
- What could fail: Permanent block or invalid selectors
- How it handles failure: Max retries then logs failure, preserves last good data

### Validation
- What it does: Checks price/stock for existence, type, range before storing
- Why exists: Prevent corrupting database with bad/empty data
- What could fail: None if implemented correctly
- How it handles failure: Logs failure, skips history insert, keeps current values

### Database Schema
- What it does: Normalized storage for products, price history, and audit logs
- Why exists: Support tracking, historical queries, and compliance
- What could fail: Constraint violations (duplicates, nulls)
- How it handles healthy: Uses transactions/ordered writes, cascade deletes

### Cron Architecture
- What it does: External scheduler triggers backend scrape endpoint
- Why exists: Render free tier sleeps; need reliable 2-hour cadence
- What could fail: Overlapping runs, auth failure
- How it handles failure: Product-level lock, cron secret verification, idempotent design

### API Flow
- What it does: REST endpoints for search, tracking, history, logs, manual/scrape runs
- Why exists: Decouple frontend from scraping/scheduling logic
- What could fail: Validation errors, db errors, auth failures
- How it handles failure: Standardized error responses, logging, status codes

### Headed Mode
- What it does: Launches visible Chrome browser to demonstrate scraping
- Why exists: Required for recording and debugging
- What could fail: Browser launch, timeout
- How it handles failure: Logs errors, falls back to headless if needed

### Error Handling
- Frontend: Shows errors, allows retry, never hides failure
- Backend: Returns structured errors, logs stack traces privately
- Scraper: Logs every attempt with reason, never silently fails
- Database: Uses constraints, checks results, rolls back on failure