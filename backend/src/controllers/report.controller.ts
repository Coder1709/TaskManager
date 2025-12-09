import { Response, NextFunction } from 'express';
import { ReportType } from '@prisma/client';
import { reportService } from '../services/report.service';
import { ApiResponse } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

/**
 * @swagger
 * /api/reports/daily:
 *   post:
 *     summary: Generate daily report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Daily report generated
 */
export const generateDailyReport = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const date = req.body.date ? new Date(req.body.date) : undefined;
        const report = await reportService.generateDailyReport(req.user!.id, date);
        res.status(200).json(ApiResponse.success(report));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/reports/weekly:
 *   post:
 *     summary: Generate weekly report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Weekly report generated
 */
export const generateWeeklyReport = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const date = req.body.date ? new Date(req.body.date) : undefined;
        const report = await reportService.generateWeeklyReport(req.user!.id, date);
        res.status(200).json(ApiResponse.success(report));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/reports/history:
 *   get:
 *     summary: Get report history
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [DAILY, WEEKLY]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Report history
 */
export const getReportHistory = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const type = req.query.type as ReportType | undefined;
        const limit = parseInt(req.query.limit as string) || 10;
        const reports = await reportService.getReportHistory(req.user!.id, type, limit);
        res.status(200).json(ApiResponse.success(reports));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/reports/team:
 *   get:
 *     summary: Get team reports (manager/admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [DAILY, WEEKLY]
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Team reports
 */
export const getTeamReport = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const type = req.query.type as ReportType;
        const date = req.query.date ? new Date(req.query.date as string) : undefined;
        const report = await reportService.getTeamReport(req.user!.id, type, date);
        res.status(200).json(ApiResponse.success(report));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/reports/send-daily:
 *   post:
 *     summary: Send daily report email
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email sent
 */
export const sendDailyReportEmail = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        await reportService.sendDailyReportEmail(req.user!.id);
        res.status(200).json(ApiResponse.success({ message: 'Daily report email sent' }));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/reports/send-weekly:
 *   post:
 *     summary: Send weekly report email
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email sent
 */
export const sendWeeklyReportEmail = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        await reportService.sendWeeklyReportEmail(req.user!.id);
        res.status(200).json(ApiResponse.success({ message: 'Weekly report email sent' }));
    } catch (error) {
        next(error);
    }
};
