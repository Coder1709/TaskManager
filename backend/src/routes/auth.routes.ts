import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
    signupSchema,
    verifyOtpSchema,
    loginSchema,
    refreshTokenSchema,
    updateProfileSchema,
} from '../validators/schemas';

const router = Router();

// Public routes
router.post('/signup', validate(signupSchema), authController.signup);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

// Protected routes
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getProfile);
router.patch('/me', authMiddleware, validate(updateProfileSchema), authController.updateProfile);

export default router;
