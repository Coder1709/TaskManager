import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { config } from '../config';
import { emailService } from './email.service';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';

interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

class AuthService {
    // Generate a 6-digit OTP
    private generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Hash password
    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 12);
    }

    // Verify password
    async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    // Generate JWT tokens
    generateTokens(userId: string, email: string, role: string): TokenPair {
        const accessToken = jwt.sign(
            { userId, email, role },
            config.jwt.accessSecret,
            { expiresIn: config.jwt.accessExpiry } as SignOptions
        );

        const refreshToken = jwt.sign(
            { userId, email, role, type: 'refresh' },
            config.jwt.refreshSecret,
            { expiresIn: config.jwt.refreshExpiry } as SignOptions
        );

        return { accessToken, refreshToken };
    }

    // Initiate signup - create pending user and send OTP
    async initiateSignup(email: string, password: string, name: string): Promise<{ message: string; userId: string }> {
        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (existingUser) {
            if (existingUser.isVerified) {
                throw new AppError('Email already registered', 400);
            }
            // User exists but not verified - resend OTP
            return this.resendOtp(existingUser.id, existingUser.email, existingUser.name);
        }

        // Create unverified user
        const hashedPassword = await this.hashPassword(password);
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password: hashedPassword,
                name,
                isVerified: false,
            },
        });

        // Generate and save OTP
        const otp = this.generateOtp();
        const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

        await prisma.otpToken.create({
            data: {
                userId: user.id,
                code: otp,
                expiresAt,
            },
        });

        // Send OTP email
        await emailService.sendOtp(email, otp, name);

        logger.info(`Signup initiated for ${email}`);

        return {
            message: 'Verification code sent to your email',
            userId: user.id,
        };
    }

    // Resend OTP
    private async resendOtp(userId: string, email: string, name: string): Promise<{ message: string; userId: string }> {
        // Invalidate previous OTPs
        await prisma.otpToken.updateMany({
            where: { userId, used: false },
            data: { used: true },
        });

        // Generate new OTP
        const otp = this.generateOtp();
        const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

        await prisma.otpToken.create({
            data: {
                userId,
                code: otp,
                expiresAt,
            },
        });

        // Send OTP email
        await emailService.sendOtp(email, otp, name);

        logger.info(`OTP resent for ${email}`);

        return {
            message: 'Verification code sent to your email',
            userId,
        };
    }

    // Verify OTP and complete signup
    async verifyOtp(userId: string, code: string): Promise<TokenPair & { user: any }> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        if (user.isVerified) {
            throw new AppError('Email already verified', 400);
        }

        // Find valid OTP
        const otpToken = await prisma.otpToken.findFirst({
            where: {
                userId,
                code,
                used: false,
                expiresAt: { gt: new Date() },
            },
        });

        if (!otpToken) {
            throw new AppError('Invalid or expired verification code', 400);
        }

        // Mark OTP as used and verify user
        await prisma.$transaction([
            prisma.otpToken.update({
                where: { id: otpToken.id },
                data: { used: true },
            }),
            prisma.user.update({
                where: { id: userId },
                data: { isVerified: true },
            }),
        ]);

        // Generate tokens
        const tokens = this.generateTokens(user.id, user.email, user.role);

        // Save refresh token
        await this.saveRefreshToken(user.id, tokens.refreshToken);

        logger.info(`Email verified for ${user.email}`);

        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    }

    // Login
    async login(email: string, password: string): Promise<TokenPair & { user: any }> {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            throw new AppError('Invalid email or password', 401);
        }

        const isValidPassword = await this.verifyPassword(password, user.password);
        if (!isValidPassword) {
            throw new AppError('Invalid email or password', 401);
        }

        if (!user.isVerified) {
            // Resend OTP for unverified user
            await this.resendOtp(user.id, user.email, user.name);
            throw new AppError('Email not verified. A new verification code has been sent.', 403);
        }

        // Generate tokens
        const tokens = this.generateTokens(user.id, user.email, user.role);

        // Save refresh token
        await this.saveRefreshToken(user.id, tokens.refreshToken);

        logger.info(`User logged in: ${user.email}`);

        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    }

    // Refresh access token
    async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
        try {
            const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;

            // Check if refresh token is valid in database
            const storedToken = await prisma.refreshToken.findFirst({
                where: {
                    token: refreshToken,
                    userId: decoded.userId,
                    revoked: false,
                    expiresAt: { gt: new Date() },
                },
            });

            if (!storedToken) {
                throw new AppError('Invalid refresh token', 401);
            }

            // Get user
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
            });

            if (!user || !user.isVerified) {
                throw new AppError('User not found or not verified', 401);
            }

            // Generate new tokens
            const tokens = this.generateTokens(user.id, user.email, user.role);

            // Revoke old refresh token and save new one
            await prisma.$transaction([
                prisma.refreshToken.update({
                    where: { id: storedToken.id },
                    data: { revoked: true },
                }),
                prisma.refreshToken.create({
                    data: {
                        userId: user.id,
                        token: tokens.refreshToken,
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                    },
                }),
            ]);

            logger.info(`Token refreshed for ${user.email}`);

            return tokens;
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new AppError('Invalid refresh token', 401);
            }
            throw error;
        }
    }

    // Logout - revoke refresh token
    async logout(userId: string, refreshToken?: string): Promise<void> {
        if (refreshToken) {
            // Revoke specific token
            await prisma.refreshToken.updateMany({
                where: {
                    userId,
                    token: refreshToken,
                },
                data: { revoked: true },
            });
        } else {
            // Revoke all tokens for user
            await prisma.refreshToken.updateMany({
                where: { userId },
                data: { revoked: true },
            });
        }

        logger.info(`User logged out: ${userId}`);
    }

    // Save refresh token to database
    private async saveRefreshToken(userId: string, token: string): Promise<void> {
        await prisma.refreshToken.create({
            data: {
                userId,
                token,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
        });
    }

    // Get user by ID
    async getUserById(userId: string): Promise<any> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                timezone: true,
                isVerified: true,
                createdAt: true,
            },
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        return user;
    }

    // Update user profile
    async updateProfile(userId: string, data: { name?: string; timezone?: string }): Promise<any> {
        const user = await prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                timezone: true,
            },
        });

        return user;
    }
}

export const authService = new AuthService();
