const logLevel = process.env.LOG_LEVEL || 'warn';

const noop = () => {};
const simpleLogger: Record<string, (...args: unknown[]) => void> = {
  error: (...args) => console.error(...args),
  warn: (...args) => console.warn(...args),
  info: logLevel === 'debug' || logLevel === 'info' ? (...args) => console.log(...args) : noop,
  debug: logLevel === 'debug' ? (...args) => console.log(...args) : noop,
};

export const logger = simpleLogger;
