type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const IS_PRODUCTION = import.meta.env.PROD;
const MIN_LEVEL: LogLevel = IS_PRODUCTION ? 'warn' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function createEntry(level: LogLevel, message: string, data?: Record<string, unknown>): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    data,
  };
}

function formatForConsole(entry: LogEntry): string {
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  if (!shouldLog(level)) return;

  const entry = createEntry(level, message, data);
  const formatted = formatForConsole(entry);

  switch (level) {
    case 'debug':
      console.debug(formatted, data || '');
      break;
    case 'info':
      console.info(formatted, data || '');
      break;
    case 'warn':
      console.warn(formatted, data || '');
      break;
    case 'error':
      console.error(formatted, data || '');
      break;
  }

  // In production, errors could be sent to an external service
  // e.g., Sentry, LogRocket, Datadog
  if (IS_PRODUCTION && level === 'error') {
    sendToExternalService(entry);
  }
}

function sendToExternalService(entry: LogEntry) {
  // Placeholder for external logging service integration
  // Example: Sentry.captureException(new Error(entry.message));
  // Example: fetch('/api/logs', { method: 'POST', body: JSON.stringify(entry) });
  void entry;
}

export const logger = {
  debug: (message: string, data?: Record<string, unknown>) => log('debug', message, data),
  info: (message: string, data?: Record<string, unknown>) => log('info', message, data),
  warn: (message: string, data?: Record<string, unknown>) => log('warn', message, data),
  error: (message: string, data?: Record<string, unknown>) => log('error', message, data),
};
