import { Router } from 'express';
import * as reportController from '../controllers/report.controller';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Report generation routes
router.post('/daily', reportController.generateDailyReport);
router.post('/weekly', reportController.generateWeeklyReport);

// Email report routes
router.post('/send-daily', reportController.sendDailyReportEmail);
router.post('/send-weekly', reportController.sendWeeklyReportEmail);

// History routes
router.get('/history', reportController.getReportHistory);

// Team reports (manager/admin only)
router.get('/team', requireRole('MANAGER', 'ADMIN'), reportController.getTeamReport);

export default router;
