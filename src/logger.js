import winston from 'winston';
import { config } from './config.js';
import { existsSync, mkdirSync } from 'fs';

// Ensure logs directory exists
if (!existsSync(config.paths.logs)) {
    mkdirSync(config.paths.logs, { recursive: true });
}

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
});

// Create logger instance
export const logger = winston.createLogger({
    level: config.logging.level,
    format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports: [
        // Console output with colors
        new winston.transports.Console({
            format: combine(
                colorize(),
                logFormat
            )
        }),
        // File output for all logs
        new winston.transports.File({
            filename: `${config.paths.logs}/combined.log`,
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Separate file for errors
        new winston.transports.File({
            filename: `${config.paths.logs}/error.log`,
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5
        })
    ]
});

// Helper methods for common log patterns
logger.sweepstakes = (site, message) => {
    logger.info(`[${site.toUpperCase()}] ${message}`);
};

logger.success = (message) => {
    logger.info(`✅ ${message}`);
};

logger.failure = (message) => {
    logger.error(`❌ ${message}`);
};
