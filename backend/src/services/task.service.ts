import { Prisma, TaskStatus, TaskPriority } from '@prisma/client';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import logger from '../config/logger';

interface CreateTaskInput {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: Date;
    storyPoints?: number;
    projectId: string;
    assigneeId?: string;
    reporterId: string;
    labelIds?: string[];
    sprintId?: string;
}

interface UpdateTaskInput {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: Date | null;
    storyPoints?: number | null;
    assigneeId?: string | null;
    labelIds?: string[];
    sprintId?: string | null;
}

interface TaskFilters {
    projectId?: string;
    status?: TaskStatus | TaskStatus[];
    priority?: TaskPriority | TaskPriority[];
    assigneeId?: string;
    reporterId?: string;
    labelIds?: string[];
    dueDateFrom?: Date;
    dueDateTo?: Date;
    search?: string;
    sprintId?: string;
}

interface PaginationOptions {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

class TaskService {
    async create(input: CreateTaskInput, userId: string): Promise<any> {
        // Verify project exists and user has access
        const project = await this.verifyProjectAccess(input.projectId, userId);
        if (!project) {
            throw new AppError('Project not found or access denied', 404);
        }

        // Get max order index for the status column
        const maxOrder = await prisma.task.aggregate({
            where: { projectId: input.projectId, status: input.status || 'BACKLOG' },
            _max: { orderIndex: true },
        });

        const task = await prisma.task.create({
            data: {
                title: input.title,
                description: input.description,
                status: input.status || 'BACKLOG',
                priority: input.priority || 'MEDIUM',
                dueDate: input.dueDate,
                storyPoints: input.storyPoints,
                projectId: input.projectId,
                assigneeId: input.assigneeId,
                reporterId: input.reporterId,
                sprintId: input.sprintId,
                orderIndex: (maxOrder._max.orderIndex || 0) + 1,
            },
            include: this.getTaskInclude(),
        });

        // Add labels
        if (input.labelIds && input.labelIds.length > 0) {
            await prisma.taskLabel.createMany({
                data: input.labelIds.map((labelId) => ({
                    taskId: task.id,
                    labelId,
                })),
            });
        }

        // Log activity
        await this.logActivity(task.id, userId, 'CREATED', { title: task.title });

        logger.info(`Task created: ${task.id} by ${userId}`);

        return this.getById(task.id, userId);
    }

    async update(taskId: string, input: UpdateTaskInput, userId: string): Promise<any> {
        const task = await this.getById(taskId, userId);
        if (!task) {
            throw new AppError('Task not found', 404);
        }

        const changes: any = {};

        // Track status change for activity log
        if (input.status && input.status !== task.status) {
            changes.status = { from: task.status, to: input.status };
        }

        // Update task
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: {
                title: input.title,
                description: input.description,
                status: input.status,
                priority: input.priority,
                dueDate: input.dueDate,
                storyPoints: input.storyPoints,
                assigneeId: input.assigneeId,
                sprintId: input.sprintId,
            },
            include: this.getTaskInclude(),
        });

        // Update labels if provided
        if (input.labelIds !== undefined) {
            await prisma.taskLabel.deleteMany({ where: { taskId } });
            if (input.labelIds.length > 0) {
                await prisma.taskLabel.createMany({
                    data: input.labelIds.map((labelId) => ({
                        taskId,
                        labelId,
                    })),
                });
            }
        }

        // Log activity
        if (Object.keys(changes).length > 0) {
            await this.logActivity(taskId, userId, 'UPDATED', changes);
        }

        logger.info(`Task updated: ${taskId} by ${userId}`);

        return this.getById(taskId, userId);
    }

    async updateStatus(taskId: string, status: TaskStatus, orderIndex: number, userId: string): Promise<any> {
        const task = await this.getById(taskId, userId);
        if (!task) {
            throw new AppError('Task not found', 404);
        }

        const oldStatus = task.status;

        await prisma.task.update({
            where: { id: taskId },
            data: { status, orderIndex },
        });

        if (oldStatus !== status) {
            await this.logActivity(taskId, userId, 'STATUS_CHANGED', {
                from: oldStatus,
                to: status,
            });
        }

        return this.getById(taskId, userId);
    }

    async delete(taskId: string, userId: string): Promise<void> {
        const task = await this.getById(taskId, userId);
        if (!task) {
            throw new AppError('Task not found', 404);
        }

        await prisma.task.delete({ where: { id: taskId } });

        logger.info(`Task deleted: ${taskId} by ${userId}`);
    }

    async getById(taskId: string, userId: string): Promise<any> {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: this.getTaskInclude(),
        });

        if (!task) {
            return null;
        }

        // Verify user has access to the project
        const hasAccess = await this.verifyProjectAccess(task.projectId, userId);
        if (!hasAccess) {
            throw new AppError('Access denied', 403);
        }

        return this.formatTask(task);
    }

    async list(
        userId: string,
        filters: TaskFilters,
        pagination: PaginationOptions
    ): Promise<{ tasks: any[]; total: number }> {
        const where: Prisma.TaskWhereInput = {};

        // Build filter conditions
        if (filters.projectId) {
            where.projectId = filters.projectId;
        } else {
            // Get all projects user has access to
            const userProjects = await this.getUserProjectIds(userId);
            where.projectId = { in: userProjects };
        }

        if (filters.status) {
            where.status = Array.isArray(filters.status)
                ? { in: filters.status }
                : filters.status;
        }

        if (filters.priority) {
            where.priority = Array.isArray(filters.priority)
                ? { in: filters.priority }
                : filters.priority;
        }

        if (filters.assigneeId) {
            where.assigneeId = filters.assigneeId;
        }

        if (filters.reporterId) {
            where.reporterId = filters.reporterId;
        }

        if (filters.sprintId) {
            where.sprintId = filters.sprintId;
        }

        if (filters.dueDateFrom || filters.dueDateTo) {
            where.dueDate = {
                ...(filters.dueDateFrom && { gte: filters.dueDateFrom }),
                ...(filters.dueDateTo && { lte: filters.dueDateTo }),
            };
        }

        if (filters.search) {
            where.OR = [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        if (filters.labelIds && filters.labelIds.length > 0) {
            where.labels = {
                some: {
                    labelId: { in: filters.labelIds },
                },
            };
        }

        const [tasks, total] = await Promise.all([
            prisma.task.findMany({
                where,
                include: this.getTaskInclude(),
                skip: (pagination.page - 1) * pagination.limit,
                take: pagination.limit,
                orderBy: {
                    [pagination.sortBy || 'createdAt']: pagination.sortOrder || 'desc',
                },
            }),
            prisma.task.count({ where }),
        ]);

        return {
            tasks: tasks.map(this.formatTask),
            total,
        };
    }

    async getByStatusForBoard(projectId: string, userId: string): Promise<Record<string, any[]>> {
        // Verify project access
        const hasAccess = await this.verifyProjectAccess(projectId, userId);
        if (!hasAccess) {
            throw new AppError('Project not found or access denied', 403);
        }

        const tasks = await prisma.task.findMany({
            where: { projectId },
            include: this.getTaskInclude(),
            orderBy: { orderIndex: 'asc' },
        });

        // Group by status
        const grouped: Record<string, any[]> = {
            BACKLOG: [],
            TODO: [],
            IN_PROGRESS: [],
            IN_REVIEW: [],
            DONE: [],
        };

        tasks.forEach((task) => {
            grouped[task.status].push(this.formatTask(task));
        });

        return grouped;
    }

    async getTasksForReport(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<any[]> {
        const userProjects = await this.getUserProjectIds(userId);

        const tasks = await prisma.task.findMany({
            where: {
                projectId: { in: userProjects },
                AND: [
                    {
                        OR: [
                            { assigneeId: userId },
                            { reporterId: userId },
                        ],
                    },
                    {
                        OR: [
                            { createdAt: { gte: startDate, lte: endDate } },
                            { updatedAt: { gte: startDate, lte: endDate } },
                        ],
                    },
                ],
            },
            include: this.getTaskInclude(),
            orderBy: { updatedAt: 'desc' },
        });

        return tasks.map(this.formatTask);
    }

    private async verifyProjectAccess(projectId: string, userId: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });

        // Admins have access to all projects
        if (user?.role === 'ADMIN') {
            const project = await prisma.project.findUnique({ where: { id: projectId } });
            return !!project;
        }

        // Check if user is owner or member
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
            },
        });

        return !!project;
    }

    private async getUserProjectIds(userId: string): Promise<string[]> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });

        // Admins have access to all projects
        if (user?.role === 'ADMIN') {
            const projects = await prisma.project.findMany({ select: { id: true } });
            return projects.map((p) => p.id);
        }

        const projects = await prisma.project.findMany({
            where: {
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
            },
            select: { id: true },
        });

        return projects.map((p) => p.id);
    }

    private async logActivity(
        taskId: string,
        userId: string,
        action: string,
        details: any
    ): Promise<void> {
        await prisma.activityLog.create({
            data: {
                taskId,
                userId,
                action,
                details,
            },
        });
    }

    private getTaskInclude() {
        return {
            project: {
                select: { id: true, name: true, key: true },
            },
            assignee: {
                select: { id: true, name: true, email: true },
            },
            reporter: {
                select: { id: true, name: true, email: true },
            },
            labels: {
                include: {
                    label: {
                        select: { id: true, name: true, color: true },
                    },
                },
            },
            sprint: {
                select: { id: true, name: true },
            },
            _count: {
                select: { comments: true },
            },
        };
    }

    private formatTask(task: any): any {
        return {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate,
            storyPoints: task.storyPoints,
            orderIndex: task.orderIndex,
            project: task.project,
            assignee: task.assignee,
            reporter: task.reporter,
            labels: task.labels?.map((tl: any) => tl.label) || [],
            sprint: task.sprint,
            commentsCount: task._count?.comments || 0,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
        };
    }
}

export const taskService = new TaskService();
