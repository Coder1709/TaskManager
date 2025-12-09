import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { ApiResponse } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import logger from '../config/logger';

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent to email
 *       400:
 *         description: Email already registered
 */
export const signup = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { email, password, name } = req.body;
        const result = await authService.initiateSignup(email, password, name);
        res.status(200).json(ApiResponse.success(result));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and complete signup
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, code]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               code:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *     responses:
 *       200:
 *         description: Email verified, returns tokens
 *       400:
 *         description: Invalid or expired OTP
 */
export const verifyOtp = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { userId, code } = req.body;
        const result = await authService.verifyOtp(userId, code);
        res.status(200).json(ApiResponse.success(result));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns tokens
 *       401:
 *         description: Invalid credentials
 */
export const login = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password);
        res.status(200).json(ApiResponse.success(result));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New tokens returned
 *       401:
 *         description: Invalid refresh token
 */
export const refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { refreshToken } = req.body;
        const tokens = await authService.refreshAccessToken(refreshToken);
        res.status(200).json(ApiResponse.success(tokens));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout and revoke refresh token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
export const logout = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { refreshToken } = req.body;
        await authService.logout(req.user!.id, refreshToken);
        res.status(200).json(ApiResponse.success({ message: 'Logged out successfully' }));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
export const getProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const user = await authService.getUserById(req.user!.id);
        res.status(200).json(ApiResponse.success(user));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/auth/me:
 *   patch:
 *     summary: Update current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               timezone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated user profile
 */
export const updateProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { name, timezone } = req.body;
        const user = await authService.updateProfile(req.user!.id, { name, timezone });
        res.status(200).json(ApiResponse.success(user));
    } catch (error) {
        next(error);
    }
};
