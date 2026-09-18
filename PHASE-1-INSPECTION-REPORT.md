# PHASE 1: Mock Store Inspection Report

**Date**: 2026-09-19  
**Target**: https://demo.inelabteamdev.com/

## Executive Summary

The INE mock store is a sophisticated anti-scraping challenge designed to test engineering judgment. Lightweight HTTP + HTML parsing is **insufficient**; Playwright is genuinely required due to:

1. Price/stock data delivered via challenge-response after mouse interaction
2. XOR-encrypted payloads requiring client-side decryption
3. Canvas/WebGL fingerprinting and hover-tracking (8+ moves, 600ms dwell)
4. Built-in retry logic (6 attempts with exponential backoff)
5. Random delays (35% chance of 900ms injection)

## API Endpoints Discovered

### Working Endpoints
- `GET /api/layout` → Returns rotating CSS class names + variant
- `GET /api/catalog?page=N&pageSize=M&q=TERM` → Product search (q parameter works)
- `GET /api/catalog?page=N&pageSize=M` → Paginated catalog (pageSize up to 100?)
- `GET /api/product/:id` → Product metadata (name, brand, description, specs) **NO PRICE/STOCK**
- `GET /product/:id` → SPA shell (React root)
- `GET /p/:id` → Alias to product page
- `GET /products/:id` → Alias to product page
- `GET /item/:id` → Alias to product page

### Failed Endpoints (404)
- `/api/search*`
- `/api/products*`

## Product Data Flow

### Step 1: Load product metadata
```http
GET /api/product/528
```
Returns: id, slug, name, brand, category, sku, description, specs, reviews

### Step 2: Trigger price reveal (client-side)
1. User hovers over price area (triggers mousemove events)
2. Client tracks: 8+ movements + 600ms dwell minimum
3. Client builds challenge payload:
   - XOR-decrypts string table from `/ge` endpoint
   - Fetches layout for current CSS class mapping
   - Performs canvas/WebGL fingerprinting
   - Encrypts movement snapshot + token
4. Client posts to quote endpoint:
   ```http
   POST https://demo.inelabteamdev.com/quote/<productId>
   Headers: Content-Type: application/json, Cookie: <fingerprint>
   Body: {
     [encrypted movement data],
     productId: 528,
     token: <from step 3>
   }
   ```
5. Server validates and returns:
   ```json
   {
     "shown": 429,          // actual price *some factor*
     "mrp": 599,
     "sale": null,
     "badgePct": null,
     "stock": 15,
     "currency": "INR",
     "at": 1726742400000,   // timestamp
     "rating": 4.5,
     "ratingCount": 128,
     "seller": "Amperage",
     "deliveryDays": 3,
     "variant": 1,
     "pending": 0,
     "format": "standard",
     "triple": false
   }
   ```

### Step 3: Price formatting (client-side)
Actual price = `shown / 0.6 - (id % 37 / 37 * 0.4)`  // inverse of Br(e) in JS
Stock = `shown` field directly

## Protection Mechanisms

1. **Hover gating**: Requires 8+ mouse movements over price area with 600ms dwell
2. **Movement validation**: Tracks velocity/pattern, rejects bot-like movement
3. **Canvas fingerprinting**: Draws gradient + text, hashes result
4. **WebGL fingerprinting**: Queries vendor/renderer/version
5. **Anti-tampering**: Obfuscated string table, control flow flattening
6. **Rate limiting**: 429 responses trigger custom error
7. **Retry logic**: 6 attempts with 300ms * attempt backoff
8. **Random delays**: 35% chance of 900ms setTimeout in Xn()

## Selectors & Class Rotation
Layout API returns rotating class names every response:
```json
{
  "classes": {
    "priceWrap": "pw-k2",      // changes per variant
    "priceValue": "pv-k2", 
    "stock": "st-k2",
    // ...
  }
}
```
Selectors must be fetched fresh from `/api/layout` before each scrape.

## Search Behavior
- Works via `/api/catalog?q=TERM` OR `/api/catalog?search=TERM` OR `/api/catalog?query=TERM`
- Also works with `/api/catalog?page=1&pageSize=20&q=TERM`
- Returns: id, slug, name, brand, category, sku, description
- Pagination: page, pageSize, pages, total fields

## Failure Modes Observed
- HTTP 429: Rate limit (custom error thrown)
- HTTP 401/403: Fingerprint failure
- Non-2xx: Network/error responses
- Timeout: Not observed but protected by 900ms max delay
- Invalid data: Possible if challenge fails

## Recommendation for Scraper Implementation

**Use Playwright** with these adaptations:
1. Navigate to `/product/:id` or `/p/:id`
2. Wait for price container to appear
3. Hover over price area with human-like movement (8+ points, 600ms+ dwell)
4. Wait for quote request to complete (intercept or observe DOM change)
5. Extract price/stock from updated DOM
6. Validate values (positive numbers, reasonable ranges)
7. Implement retry with exponential backoff at product level
8. Fetch fresh layout before each product scrape
9. Log all attempts (success/retry/failure) with reasons

**Do NOT attempt to re-implement the challenge-response** — it's intentionally complex and fragile.

## Conclusion

The mock store requires genuine browser automation. Attempting to bypass with HTTP-only approaches will fail silently or produce incorrect data, violating the assignment's core reliability requirement. Playwright is not just permitted — it is necessary.

Next steps: Design database schema (PHASE 2), then implement independent scraper service (PHASE 3).