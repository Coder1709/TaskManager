import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import logger from '../config/logger';

interface CreateProjectInput {
    name: string;
    key: string;
    description?: string;
    ownerId: string;
}

interface UpdateProjectInput {
    name?: string;
    description?: string;
}

class ProjectService {
    async create(input: CreateProjectInput): Promise<any> {
        // Check if key is unique
        const existingProject = await prisma.project.findUnique({
            where: { key: input.key.toUpperCase() },
        });

        if (existingProject) {
            throw new AppError('Project key already exists', 400);
        }

        const project = await prisma.project.create({
            data: {
                name: input.name,
                key: input.key.toUpperCase(),
                description: input.description,
                ownerId: input.ownerId,
                // Auto-add owner as member
                members: {
                    create: {
                        userId: input.ownerId,
                    },
                },
            },
            include: this.getProjectInclude(),
        });

        logger.info(`Project created: ${project.id} by ${input.ownerId}`);

        return this.formatProject(project);
    }

    async update(projectId: string, input: UpdateProjectInput, userId: string): Promise<any> {
        const project = await this.getById(projectId, userId);
        if (!project) {
            throw new AppError('Project not found', 404);
        }

        // Only owner or admin can update
        if (project.owner.id !== userId) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user?.role !== 'ADMIN') {
                throw new AppError('Only project owner can update project', 403);
            }
        }

        const updatedProject = await prisma.project.update({
            where: { id: projectId },
            data: input,
            include: this.getProjectInclude(),
        });

        logger.info(`Project updated: ${projectId} by ${userId}`);

        return this.formatProject(updatedProject);
    }

    async delete(projectId: string, userId: string): Promise<void> {
        const project = await this.getById(projectId, userId);
        if (!project) {
            throw new AppError('Project not found', 404);
        }

        // Only owner or admin can delete
        if (project.owner.id !== userId) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user?.role !== 'ADMIN') {
                throw new AppError('Only project owner can delete project', 403);
            }
        }

        await prisma.project.delete({ where: { id: projectId } });

        logger.info(`Project deleted: ${projectId} by ${userId}`);
    }

    async getById(projectId: string, userId: string): Promise<any> {
        const user = await prisma.user.findUnique({ where: { id: userId } });

        let project;

        // Admins can see all projects
        if (user?.role === 'ADMIN') {
            project = await prisma.project.findUnique({
                where: { id: projectId },
                include: this.getProjectInclude(),
            });
        } else {
            project = await prisma.project.findFirst({
                where: {
                    id: projectId,
                    OR: [
                        { ownerId: userId },
                        { members: { some: { userId } } },
                    ],
                },
                include: this.getProjectInclude(),
            });
        }

        if (!project) {
            return null;
        }

        return this.formatProject(project);
    }

    async list(userId: string): Promise<any[]> {
        const user = await prisma.user.findUnique({ where: { id: userId } });

        let projects;

        // Admins can see all projects
        if (user?.role === 'ADMIN') {
            projects = await prisma.project.findMany({
                include: this.getProjectInclude(),
                orderBy: { createdAt: 'desc' },
            });
        } else {
            projects = await prisma.project.findMany({
                where: {
                    OR: [
                        { ownerId: userId },
                        { members: { some: { userId } } },
                    ],
                },
                include: this.getProjectInclude(),
                orderBy: { createdAt: 'desc' },
            });
        }

        return projects.map(this.formatProject);
    }

    async addMember(projectId: string, memberEmail: string, userId: string): Promise<any> {
        const project = await this.getById(projectId, userId);
        if (!project) {
            throw new AppError('Project not found', 404);
        }

        // Only owner or admin can add members
        if (project.owner.id !== userId) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user?.role !== 'ADMIN') {
                throw new AppError('Only project owner can add members', 403);
            }
        }

        // Find user by email
        const memberUser = await prisma.user.findUnique({
            where: { email: memberEmail.toLowerCase() },
        });

        if (!memberUser) {
            throw new AppError('User not found', 404);
        }

        // Check if already a member
        const existingMember = await prisma.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId: memberUser.id,
                    projectId,
                },
            },
        });

        if (existingMember) {
            throw new AppError('User is already a member of this project', 400);
        }

        await prisma.projectMember.create({
            data: {
                userId: memberUser.id,
                projectId,
            },
        });

        logger.info(`Member added to project: ${projectId}, member: ${memberUser.id}`);

        return this.getById(projectId, userId);
    }

    async addMembers(projectId: string, emails: string[], userId: string): Promise<{ added: string[]; failed: { email: string; reason: string }[] }> {
        const project = await this.getById(projectId, userId);
        if (!project) {
            throw new AppError('Project not found', 404);
        }

        // Only owner or admin can add members
        if (project.owner.id !== userId) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user?.role !== 'ADMIN') {
                throw new AppError('Only project owner can add members', 403);
            }
        }

        const added: string[] = [];
        const failed: { email: string; reason: string }[] = [];

        for (const email of emails) {
            try {
                const memberUser = await prisma.user.findUnique({
                    where: { email: email.toLowerCase() },
                });

                if (!memberUser) {
                    failed.push({ email, reason: 'User not found' });
                    continue;
                }

                const existingMember = await prisma.projectMember.findUnique({
                    where: {
                        userId_projectId: {
                            userId: memberUser.id,
                            projectId,
                        },
                    },
                });

                if (existingMember) {
                    failed.push({ email, reason: 'Already a member' });
                    continue;
                }

                await prisma.projectMember.create({
                    data: {
                        userId: memberUser.id,
                        projectId,
                    },
                });

                added.push(email);
                logger.info(`Member added to project: ${projectId}, member: ${memberUser.id}`);
            } catch (error) {
                failed.push({ email, reason: 'Failed to add' });
            }
        }

        return { added, failed };
    }

    async removeMember(projectId: string, memberId: string, userId: string): Promise<any> {
        const project = await this.getById(projectId, userId);
        if (!project) {
            throw new AppError('Project not found', 404);
        }

        // Only owner or admin can remove members
        if (project.owner.id !== userId) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user?.role !== 'ADMIN') {
                throw new AppError('Only project owner can remove members', 403);
            }
        }

        // Cannot remove owner
        if (memberId === project.owner.id) {
            throw new AppError('Cannot remove project owner from members', 400);
        }

        await prisma.projectMember.delete({
            where: {
                userId_projectId: {
                    userId: memberId,
                    projectId,
                },
            },
        });

        logger.info(`Member removed from project: ${projectId}, member: ${memberId}`);

        return this.getById(projectId, userId);
    }

    async getMembers(projectId: string, userId: string): Promise<any[]> {
        const project = await this.getById(projectId, userId);
        if (!project) {
            throw new AppError('Project not found', 404);
        }

        return project.members;
    }

    // Labels
    async createLabel(
        projectId: string,
        name: string,
        color: string,
        userId: string
    ): Promise<any> {
        const project = await this.getById(projectId, userId);
        if (!project) {
            throw new AppError('Project not found', 404);
        }

        const label = await prisma.label.create({
            data: {
                name,
                color,
                projectId,
            },
        });

        return label;
    }

    async getLabels(projectId: string, userId: string): Promise<any[]> {
        const project = await this.getById(projectId, userId);
        if (!project) {
            throw new AppError('Project not found', 404);
        }

        return prisma.label.findMany({
            where: { projectId },
            orderBy: { name: 'asc' },
        });
    }

    async deleteLabel(labelId: string, userId: string): Promise<void> {
        const label = await prisma.label.findUnique({
            where: { id: labelId },
            include: { project: true },
        });

        if (!label) {
            throw new AppError('Label not found', 404);
        }

        // Verify project access
        const project = await this.getById(label.projectId, userId);
        if (!project) {
            throw new AppError('Access denied', 403);
        }

        await prisma.label.delete({ where: { id: labelId } });
    }

    private getProjectInclude() {
        return {
            owner: {
                select: { id: true, name: true, email: true },
            },
            members: {
                include: {
                    user: {
                        select: { id: true, name: true, email: true },
                    },
                },
            },
            _count: {
                select: { tasks: true },
            },
        };
    }

    private formatProject(project: any): any {
        return {
            id: project.id,
            name: project.name,
            key: project.key,
            description: project.description,
            owner: project.owner,
            members: project.members?.map((m: any) => m.user) || [],
            tasksCount: project._count?.tasks || 0,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        };
    }
}

export const projectService = new ProjectService();
