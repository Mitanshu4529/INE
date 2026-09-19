# Production Dockerfile for INE Tracker Backend
FROM node:20-bookworm-slim

# Install necessary system libraries for Playwright Chromium
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libxshmfence1 \
    ca-certificates \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV PORT=10000

COPY package*.json ./
RUN npm ci

# Download Playwright Chromium binary
RUN npx playwright install chromium

COPY . .

EXPOSE 10000

CMD ["node", "src/index.js"]
