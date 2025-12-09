import { authService } from '../../src/services/auth.service';
import prisma from '../../src/config/database';
import bcrypt from 'bcryptjs';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
    hash: jest.fn().mockResolvedValue('hashedPassword'),
    compare: jest.fn(),
}));

// Mock email service
jest.mock('../../src/services/email.service', () => ({
    emailService: {
        sendOtp: jest.fn().mockResolvedValue(true),
    },
}));

describe('AuthService', () => {
    describe('initiateSignup', () => {
        it('should create a new unverified user and send OTP', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                password: 'hashedPassword',
                isVerified: false,
                role: 'USER',
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
            (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
            (prisma.otpToken.create as jest.Mock).mockResolvedValue({
                id: 'otp-123',
                code: '123456',
                userId: mockUser.id,
            });

            const result = await authService.initiateSignup(
                'test@example.com',
                'password123',
                'Test User'
            );

            expect(result.message).toBe('Verification code sent to your email');
            expect(result.userId).toBe('user-123');
            expect(prisma.user.create).toHaveBeenCalled();
            expect(prisma.otpToken.create).toHaveBeenCalled();
        });

        it('should throw error if email already exists and verified', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: 'user-123',
                email: 'test@example.com',
                isVerified: true,
            });

            await expect(
                authService.initiateSignup('test@example.com', 'password123', 'Test User')
            ).rejects.toThrow('Email already registered');
        });
    });

    describe('verifyOtp', () => {
        it('should verify OTP and return tokens', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                role: 'USER',
                isVerified: false,
            };

            const mockOtp = {
                id: 'otp-123',
                code: '123456',
                userId: 'user-123',
                used: false,
                expiresAt: new Date(Date.now() + 600000),
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (prisma.otpToken.findFirst as jest.Mock).mockResolvedValue(mockOtp);
            (prisma.otpToken.update as jest.Mock).mockResolvedValue({ ...mockOtp, used: true });
            (prisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, isVerified: true });
            (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});
            (prisma.$transaction as jest.Mock).mockImplementation(async (operations) => {
                return Promise.all(operations);
            });

            const result = await authService.verifyOtp('user-123', '123456');

            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
            expect(result.user.id).toBe('user-123');
        });

        it('should throw error for invalid OTP', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                isVerified: false,
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (prisma.otpToken.findFirst as jest.Mock).mockResolvedValue(null);

            await expect(authService.verifyOtp('user-123', '000000')).rejects.toThrow(
                'Invalid or expired verification code'
            );
        });
    });

    describe('login', () => {
        it('should login and return tokens for verified user', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password: 'hashedPassword',
                name: 'Test User',
                role: 'USER',
                isVerified: true,
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

            const result = await authService.login('test@example.com', 'password123');

            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
            expect(result.user.email).toBe('test@example.com');
        });

        it('should throw error for invalid password', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password: 'hashedPassword',
                isVerified: true,
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toThrow(
                'Invalid email or password'
            );
        });

        it('should throw error for non-existent user', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(authService.login('nonexistent@example.com', 'password')).rejects.toThrow(
                'Invalid email or password'
            );
        });
    });

    describe('logout', () => {
        it('should revoke refresh tokens on logout', async () => {
            (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

            await authService.logout('user-123', 'refresh-token');

            expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
                where: {
                    userId: 'user-123',
                    token: 'refresh-token',
                },
                data: { revoked: true },
            });
        });
    });
});
