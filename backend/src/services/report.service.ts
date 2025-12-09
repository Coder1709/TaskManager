import { ReportType } from '@prisma/client';
import prisma from '../config/database';
import { geminiService } from './gemini.service';
import { emailService } from './email.service';
import { taskService } from './task.service';
import logger from '../config/logger';

interface ReportData {
    created: number;
    completed: number;
    inProgress: number;
    overdue: number;
    tasks: Array<{
        id: string;
        title: string;
        status: string;
        priority: string;
        project: string;
        dueDate?: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
}

class ReportService {
    async generateDailyReport(userId: string, date?: Date): Promise<any> {
        const targetDate = date || new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Get user
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Get user's projects
        const projects = await prisma.project.findMany({
            where: {
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
            },
            select: { id: true },
        });

        const projectIds = projects.map((p) => p.id);

        // Get tasks
        const tasks = await prisma.task.findMany({
            where: {
                projectId: { in: projectIds },
                OR: [
                    { assigneeId: userId },
                    { reporterId: userId },
                ],
            },
            include: {
                project: { select: { name: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });

        // Calculate stats
        const now = new Date();
        const data: ReportData = {
            created: tasks.filter((t) => t.createdAt >= startOfDay && t.createdAt <= endOfDay).length,
            completed: tasks.filter((t) => t.status === 'DONE' && t.updatedAt >= startOfDay && t.updatedAt <= endOfDay).length,
            inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
            overdue: tasks.filter((t) => t.dueDate && t.dueDate < now && t.status !== 'DONE').length,
            tasks: tasks.map((t) => ({
                id: t.id,
                title: t.title,
                status: t.status,
                priority: t.priority,
                project: t.project.name,
                dueDate: t.dueDate?.toISOString() || null,
                createdAt: t.createdAt.toISOString(),
                updatedAt: t.updatedAt.toISOString(),
            })),
        };

        // Generate AI summary
        const summaryResult = await geminiService.generateDailySummary(
            user.name,
            data.tasks.map((t) => ({
                title: t.title,
                status: t.status,
                priority: t.priority,
                project: t.project,
                dueDate: t.dueDate,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
            })),
            targetDate
        );

        // Save report
        const report = await prisma.report.create({
            data: {
                type: ReportType.DAILY,
                summary: summaryResult.summary,
                data: data as any,
                userId,
            },
        });

        logger.info(`Daily report generated for ${user.email}`);

        return {
            id: report.id,
            type: report.type,
            summary: summaryResult.summary,
            isAIGenerated: summaryResult.isAIGenerated,
            data,
            createdAt: report.createdAt,
        };
    }

    async generateWeeklyReport(userId: string, weekEndDate?: Date): Promise<any> {
        const endDate = weekEndDate || new Date();
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        // Get user
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Get user's projects
        const projects = await prisma.project.findMany({
            where: {
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
            },
            select: { id: true },
        });

        const projectIds = projects.map((p) => p.id);

        // Get tasks
        const tasks = await prisma.task.findMany({
            where: {
                projectId: { in: projectIds },
                OR: [
                    { assigneeId: userId },
                    { reporterId: userId },
                ],
            },
            include: {
                project: { select: { name: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });

        // Calculate stats
        const now = new Date();
        const data: ReportData = {
            created: tasks.filter((t) => t.createdAt >= startDate && t.createdAt <= endDate).length,
            completed: tasks.filter((t) => t.status === 'DONE' && t.updatedAt >= startDate && t.updatedAt <= endDate).length,
            inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
            overdue: tasks.filter((t) => t.dueDate && t.dueDate < now && t.status !== 'DONE').length,
            tasks: tasks.map((t) => ({
                id: t.id,
                title: t.title,
                status: t.status,
                priority: t.priority,
                project: t.project.name,
                dueDate: t.dueDate?.toISOString() || null,
                createdAt: t.createdAt.toISOString(),
                updatedAt: t.updatedAt.toISOString(),
            })),
        };

        // Generate AI summary
        const summaryResult = await geminiService.generateWeeklySummary(
            user.name,
            data.tasks.map((t) => ({
                title: t.title,
                status: t.status,
                priority: t.priority,
                project: t.project,
                dueDate: t.dueDate,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
            })),
            startDate,
            endDate,
            {
                created: data.created,
                completed: data.completed,
                inProgress: data.inProgress,
                overdue: data.overdue,
            }
        );

        // Save report
        const report = await prisma.report.create({
            data: {
                type: ReportType.WEEKLY,
                summary: summaryResult.summary,
                data: data as any,
                userId,
            },
        });

        logger.info(`Weekly report generated for ${user.email}`);

        return {
            id: report.id,
            type: report.type,
            summary: summaryResult.summary,
            isAIGenerated: summaryResult.isAIGenerated,
            data,
            createdAt: report.createdAt,
        };
    }

    async sendDailyReportEmail(userId: string): Promise<void> {
        const report = await this.generateDailyReport(userId);
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) return;

        await emailService.sendDailySummary(
            user.email,
            user.name,
            report.summary,
            report.data.tasks.slice(0, 10).map((t: any) => ({
                title: t.title,
                status: t.status.replace('_', ' '),
                project: t.project,
                id: t.id,
            }))
        );
    }

    async sendWeeklyReportEmail(userId: string): Promise<void> {
        const report = await this.generateWeeklyReport(userId);
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) return;

        await emailService.sendWeeklySummary(
            user.email,
            user.name,
            report.summary,
            {
                created: report.data.created,
                completed: report.data.completed,
                inProgress: report.data.inProgress,
                overdue: report.data.overdue,
            },
            report.data.tasks.slice(0, 20).map((t: any) => ({
                title: t.title,
                status: t.status.replace('_', ' '),
                project: t.project,
                id: t.id,
            }))
        );
    }

    async getReportHistory(
        userId: string,
        type?: ReportType,
        limit: number = 10
    ): Promise<any[]> {
        const reports = await prisma.report.findMany({
            where: {
                userId,
                ...(type && { type }),
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return reports.map((r) => ({
            id: r.id,
            type: r.type,
            summary: r.summary,
            data: r.data,
            createdAt: r.createdAt,
        }));
    }

    async getTeamReport(
        managerId: string,
        type: ReportType,
        date?: Date
    ): Promise<any> {
        // Get manager's role
        const manager = await prisma.user.findUnique({
            where: { id: managerId },
        });

        if (!manager || (manager.role !== 'MANAGER' && manager.role !== 'ADMIN')) {
            throw new Error('Access denied');
        }

        // Get projects managed by this user
        const projects = await prisma.project.findMany({
            where: { ownerId: managerId },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true } },
                    },
                },
            },
        });

        const teamMemberIds = new Set<string>();
        projects.forEach((p) => {
            p.members.forEach((m) => teamMemberIds.add(m.userId));
        });

        // Get reports for all team members
        const targetDate = date || new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        const reports = await prisma.report.findMany({
            where: {
                userId: { in: Array.from(teamMemberIds) },
                type,
                createdAt: { gte: startOfDay },
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return {
            teamSize: teamMemberIds.size,
            reportsCount: reports.length,
            reports: reports.map((r) => ({
                id: r.id,
                user: r.user,
                type: r.type,
                summary: r.summary,
                data: r.data,
                createdAt: r.createdAt,
            })),
        };
    }
}

export const reportService = new ReportService();
