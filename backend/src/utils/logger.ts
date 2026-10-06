import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  simple()
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

export const logger = winston.createLogger({
  level: config.server.nodeEnv === 'production' ? 'info' : 'debug',
  format: config.server.nodeEnv === 'production' ? prodFormat : devFormat,
  defaultMeta: { service: 'facechat-backend' },
  transports: [
    new winston.transports.Console(),
  ],
});

// Structured event logging
export function logEvent(event: string, data: Record<string, any> = {}): void {
  logger.info(event, { event, ...data, timestamp: new Date().toISOString() });
}
