import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

interface CreateCommentInput {
    content: string;
    taskId: string;
    authorId: string;
}

class CommentService {
    async create(input: CreateCommentInput, userId: string): Promise<any> {
        // Verify task exists and user has access
        const task = await prisma.task.findUnique({
            where: { id: input.taskId },
            include: { project: true },
        });

        if (!task) {
            throw new AppError('Task not found', 404);
        }

        // Verify project access
        const hasAccess = await this.verifyProjectAccess(task.projectId, userId);
        if (!hasAccess) {
            throw new AppError('Access denied', 403);
        }

        const comment = await prisma.comment.create({
            data: {
                content: input.content,
                taskId: input.taskId,
                authorId: input.authorId,
            },
            include: {
                author: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        // Log activity
        await prisma.activityLog.create({
            data: {
                taskId: input.taskId,
                userId,
                action: 'COMMENT_ADDED',
                details: { commentId: comment.id },
            },
        });

        return comment;
    }

    async update(commentId: string, content: string, userId: string): Promise<any> {
        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
        });

        if (!comment) {
            throw new AppError('Comment not found', 404);
        }

        // Only author can update their comment
        if (comment.authorId !== userId) {
            throw new AppError('You can only edit your own comments', 403);
        }

        const updatedComment = await prisma.comment.update({
            where: { id: commentId },
            data: { content },
            include: {
                author: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        return updatedComment;
    }

    async delete(commentId: string, userId: string): Promise<void> {
        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            include: { task: { include: { project: true } } },
        });

        if (!comment) {
            throw new AppError('Comment not found', 404);
        }

        // Only author or admin can delete
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (comment.authorId !== userId && user?.role !== 'ADMIN') {
            throw new AppError('You can only delete your own comments', 403);
        }

        await prisma.comment.delete({ where: { id: commentId } });
    }

    async getByTaskId(taskId: string, userId: string): Promise<any[]> {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
        });

        if (!task) {
            throw new AppError('Task not found', 404);
        }

        // Verify project access
        const hasAccess = await this.verifyProjectAccess(task.projectId, userId);
        if (!hasAccess) {
            throw new AppError('Access denied', 403);
        }

        const comments = await prisma.comment.findMany({
            where: { taskId },
            include: {
                author: {
                    select: { id: true, name: true, email: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        return comments;
    }

    private async verifyProjectAccess(projectId: string, userId: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });

        if (user?.role === 'ADMIN') {
            return true;
        }

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
}

export const commentService = new CommentService();
