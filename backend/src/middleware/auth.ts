import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../config/database';
import { ApiResponse } from '../utils/response';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

export interface JwtPayload {
    userId: string;
    email: string;
    role: string;
}

export const authMiddleware = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json(ApiResponse.error('Access token required', 401));
            return;
        }

        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;

            // Verify user still exists and is verified
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, email: true, role: true, isVerified: true },
            });

            if (!user) {
                res.status(401).json(ApiResponse.error('User not found', 401));
                return;
            }

            if (!user.isVerified) {
                res.status(401).json(ApiResponse.error('Email not verified', 401));
                return;
            }

            req.user = {
                id: user.id,
                email: user.email,
                role: user.role,
            };

            next();
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                res.status(401).json(ApiResponse.error('Token expired', 401));
                return;
            }
            if (error instanceof jwt.JsonWebTokenError) {
                res.status(401).json(ApiResponse.error('Invalid token', 401));
                return;
            }
            throw error;
        }
    } catch (error) {
        next(error);
    }
};

export const requireRole = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json(ApiResponse.error('Authentication required', 401));
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json(ApiResponse.error('Insufficient permissions', 403));
            return;
        }

        next();
    };
};

export const optionalAuth = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }

        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;

            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, email: true, role: true },
            });

            if (user) {
                req.user = {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                };
            }
        } catch {
            // Token invalid, but that's okay for optional auth
        }

        next();
    } catch (error) {
        next(error);
    }
};
