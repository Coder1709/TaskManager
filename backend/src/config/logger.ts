import winston from 'winston';
import { config } from './index';

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
    })
);

const logger = winston.createLogger({
    level: config.env === 'development' ? 'debug' : 'info',
    format: logFormat,
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                config.env === 'development' ? winston.format.colorize() : winston.format.simple(),
                logFormat
            ),
        }),
    ],
});

export default logger;

