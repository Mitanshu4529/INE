# Scraper Architecture & Reliability Design Note

**Project:** INE Store Product Price Tracker  
**Target:** [INE Demo Store](https://demo.inelabteamdev.com/)  
**Role:** Software Engineer Intern Assessment  

---

## 1. How Scraping Reliability Was Achieved

The INE mock store is intentionally crafted to simulate real-world e-commerce anti-scraping challenges: dynamic client-side rendering, obfuscated data flows, deliberate asynchronous delay, flaky click handlers, rotating DOM class names, and anti-bot interaction gating. 

To ensure continuous, unattended reliability across hundreds of runs, the scraping architecture employs the following key mechanisms:

### A. Dual-Engine Scraping Strategy
* **Lightweight HTTP for Catalog & Search:** Discovering and searching products (`/api/catalog`) uses fast, lightweight HTTP requests with caching (`CATALOG_TTL_MS = 10m`). This avoids heavy browser overhead for static metadata.
* **Browser Automation (Playwright) for Price/Stock Extraction:** Product price and stock data are gated behind client-side user interactions and dynamic rendering that cannot be reliably fetched via raw HTTP requests. Playwright is used specifically for product detail pages.

### B. Human-Like Hover & Dwell Simulation
The storefront requires a series of mouse movements and a minimum dwell duration (>600ms) over `.price-block` before the price reveal mechanism unlocks.
* The scraper calculates the bounding box of `.price-block` and generates **16 interpolated mouse movements with micro-jitter** spaced across 65ms intervals.
* It enforces an explicit dwell period of 850ms before triggering the reveal button.

### C. Flaky Click Resilience & Multi-Stage Polling
* The store wraps reveal buttons in intermittent flaky handlers that drop roughly ~35% of click attempts.
* Instead of a single brittle click, the scraper implements a **progressive click retry loop** (up to 5 attempts) that checks if `.price-success` or `.price-main` rendered, re-verifying button states and performing micro-movements if the button temporarily disables.

### D. Layout-Aware Dynamic Selectors
* The store's backend rotates CSS class names per layout variant (e.g., `pw-k2`, `pv-k2`, `st-k2`) via `/api/layout`.
* The scraper fetches the latest layout configuration before scraping and uses robust semantic selectors (e.g., `.price-main`, `.price-success`, `h1`, `.stock-badge`) with fallback to layout class mappings.

### E. Computed Style & Decoy Filtering
* The storefront injects decoy elements (hidden spans with `display: none` / `visibility: hidden` and strikethrough original MRP prices).
* The extractor evaluates the browser's computed styles inside the DOM context (`window.getComputedStyle`), discarding hidden text, line-through elements, and marketing discount badges to isolate the true selling price.

### F. Exponential Backoff & Retry Pipeline
* Scrape attempts are orchestrated with an **exponential backoff policy** (`SCRAPE_RETRY_BASE_DELAY_MS * (2 ^ (attempt - 1)) + jitter`).
* Every attempt (SUCCESS, RETRYING, FAILED) is logged in the `scrape_logs` table with execution duration and error reasons.
* Failures are recorded honestly without corrupting existing historical data.

---

## 2. Trade-offs Made

| Decision | Approach Chosen | Trade-off / Rationale |
| :--- | :--- | :--- |
| **Browser Execution vs. Reverse-Engineering XOR Challenge** | Playwright Browser Automation | Reverse-engineering the client-side XOR string tables and canvas/WebGL fingerprint hashes would be extremely brittle against frontend bundle changes. Automating the browser guarantees long-term correctness under layout shifts. |
| **Catalog Caching** | In-Memory / File TTL Cache | Searching queries a local cached copy of the catalog rather than hitting the mock store on every keystroke, reducing network latency and avoiding unnecessary rate limits. |
| **External Cron vs. In-Process Node Loop** | `cron-job.org` via protected HTTP endpoint (`POST /api/scrape/run`) | Render free-tier web services sleep after 15 minutes of inactivity. An internal `setInterval` or node-cron loop stops working when the container sleeps. External cron pings wake the service reliably every 2 hours. |
| **Data Integrity on Failure** | Preserving last known valid price/stock | On scrape failure or timeout, the tracker logs the failure in `scrape_logs` but never updates `current_price` to `null` or `0`, nor inserts corrupt rows into `price_history`. |

---

## 3. What AI Tools Got Wrong on the First Attempt & How It Was Corrected

| Initial AI Suggestion | Why It Failed | Corrected Implementation |
| :--- | :--- | :--- |
| **Simple Axios + Cheerio HTTP Scraper** | Suggested fetching the HTML with `axios` and parsing with `cheerio`. Failed completely because the mock store is an SPA and price/stock data is injected after client-side script execution and mouse-move challenges. | Replaced with Playwright automation for price reveals, retaining lightweight HTTP only for public catalog search. |
| **Naive Single-Click Selector (`button.click()`)** | Suggested finding the reveal button and clicking it once. Failed because the store's handler randomly discards clicks and requires pre-hover dwell time. | Added multi-point trajectory hover simulation with 850ms dwell time, plus an iterative click loop that re-verifies DOM state until the price is revealed. |
| **Raw Text Parsing for Price (`priceContainer.innerText`)** | Suggested regex matching `$([\d,.]+)` on the container text. Returned strikethrough MRP prices or decoy hidden spans instead of the deal price. | Implemented DOM-level computed style inspection (`window.getComputedStyle`) to filter out elements with `display: none`, `visibility: hidden`, or `line-through` text decoration. |
| **Fixed Hardcoded CSS Classes** | Suggested selecting classes like `.price-value-2`. Failed on subsequent store revisions when layout classes mutated. | Integrated dynamic `/api/layout` fetching before every scrape session to dynamically resolve class names alongside standard semantic DOM fallback selectors. |
| **Always-On Background Interval (`setInterval`)** | Suggested running a background `setInterval` loop in Express. Failed when deployed to Render free tier because the process is put to sleep after inactivity. | Implemented a secured endpoint (`POST /api/scrape/run` with `X-Cron-Secret` header) triggered externally by `cron-job.org` every 2 hours. |
