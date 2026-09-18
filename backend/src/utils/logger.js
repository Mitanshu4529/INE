function ts() {
  return new Date().toISOString();
}

function line(level, parts) {
  const message = parts
    .map((part) => (typeof part === 'object' ? JSON.stringify(part) : String(part)))
    .join(' ');
  const out = `[${ts()}] [${level}] ${message}`;
  if (level === 'ERROR') console.error(out);
  else console.log(out);
}

export const logger = {
  info: (...parts) => line('INFO', parts),
  warn: (...parts) => line('WARN', parts),
  error: (...parts) => line('ERROR', parts),
  scrape: (message) => line('SCRAPE', [message]),
};

export function scrapeLog(event, extra = '') {
  logger.scrape(`${event}${extra ? ` ${extra}` : ''}`);
}
