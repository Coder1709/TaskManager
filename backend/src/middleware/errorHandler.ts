import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { ApiResponse } from '../utils/response';

export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    logger.error(`Error: ${err.message}`, { stack: err.stack, path: req.path });

    if (err instanceof AppError) {
        res.status(err.statusCode).json(ApiResponse.error(err.message, err.statusCode));
        return;
    }

    // Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') {
        const prismaError = err as any;
        if (prismaError.code === 'P2002') {
            res.status(409).json(ApiResponse.error('Resource already exists', 409));
            return;
        }
        if (prismaError.code === 'P2025') {
            res.status(404).json(ApiResponse.error('Resource not found', 404));
            return;
        }
    }

    // Default error
    const statusCode = 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

    res.status(statusCode).json(ApiResponse.error(message, statusCode));
};

export const notFoundHandler = (req: Request, res: Response): void => {
    res.status(404).json(ApiResponse.error(`Route ${req.originalUrl} not found`, 404));
};
