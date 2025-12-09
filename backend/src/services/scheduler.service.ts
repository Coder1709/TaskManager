import cron from 'node-cron';
import prisma from '../config/database';
import { reportService } from './report.service';
import logger from '../config/logger';

class SchedulerService {
    private dailyJob: cron.ScheduledTask | null = null;
    private weeklyJob: cron.ScheduledTask | null = null;

    start(): void {
        // Daily summary at 6 PM every day
        this.dailyJob = cron.schedule('0 18 * * *', async () => {
            logger.info('Starting daily report generation for all users');
            await this.generateDailyReportsForAllUsers();
        });

        // Weekly summary at 6 PM every Friday
        this.weeklyJob = cron.schedule('0 18 * * 5', async () => {
            logger.info('Starting weekly report generation for all users');
            await this.generateWeeklyReportsForAllUsers();
        });

        logger.info('Scheduler started: Daily reports at 6 PM, Weekly reports on Fridays at 6 PM');
    }

    stop(): void {
        if (this.dailyJob) {
            this.dailyJob.stop();
            this.dailyJob = null;
        }
        if (this.weeklyJob) {
            this.weeklyJob.stop();
            this.weeklyJob = null;
        }
        logger.info('Scheduler stopped');
    }

    async generateDailyReportsForAllUsers(): Promise<{ success: number; failed: number }> {
        const users = await prisma.user.findMany({
            where: { isVerified: true },
            select: { id: true, email: true },
        });

        let success = 0;
        let failed = 0;

        for (const user of users) {
            try {
                await reportService.sendDailyReportEmail(user.id);
                success++;
                logger.info(`Daily report sent to ${user.email}`);
            } catch (error) {
                failed++;
                logger.error(`Failed to send daily report to ${user.email}:`, error);
            }
        }

        logger.info(`Daily reports completed: ${success} success, ${failed} failed`);
        return { success, failed };
    }

    async generateWeeklyReportsForAllUsers(): Promise<{ success: number; failed: number }> {
        const users = await prisma.user.findMany({
            where: { isVerified: true },
            select: { id: true, email: true },
        });

        let success = 0;
        let failed = 0;

        for (const user of users) {
            try {
                await reportService.sendWeeklyReportEmail(user.id);
                success++;
                logger.info(`Weekly report sent to ${user.email}`);
            } catch (error) {
                failed++;
                logger.error(`Failed to send weekly report to ${user.email}:`, error);
            }
        }

        logger.info(`Weekly reports completed: ${success} success, ${failed} failed`);
        return { success, failed };
    }

    // Manual trigger methods for testing
    async triggerDailyReportsNow(): Promise<{ success: number; failed: number }> {
        logger.info('Manually triggering daily reports');
        return this.generateDailyReportsForAllUsers();
    }

    async triggerWeeklyReportsNow(): Promise<{ success: number; failed: number }> {
        logger.info('Manually triggering weekly reports');
        return this.generateWeeklyReportsForAllUsers();
    }
}

export const schedulerService = new SchedulerService();
