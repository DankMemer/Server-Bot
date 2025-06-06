import { createLogger, transports, format } from 'winston';

export const logger = createLogger({
  transports: [
    new transports.Console(),
  ],
  format: format.combine(
    format.timestamp({ format: 'HH:mm:ss MM-DD-YYYY' }),
    format.colorize(),
    format.printf(({ level, message, timestamp }) => `[${timestamp}] ${level}: ${message}`),
  ),
});
