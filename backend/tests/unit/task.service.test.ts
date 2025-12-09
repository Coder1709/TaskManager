import { taskService } from '../../src/services/task.service';
import prisma from '../../src/config/database';

describe('TaskService', () => {
    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER',
    };

    const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        key: 'TEST',
        ownerId: 'user-123',
    };

    const mockTask = {
        id: 'task-123',
        title: 'Test Task',
        description: 'Test Description',
        status: 'BACKLOG',
        priority: 'MEDIUM',
        projectId: 'project-123',
        assigneeId: 'user-123',
        reporterId: 'user-123',
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        project: { id: 'project-123', name: 'Test Project', key: 'TEST' },
        assignee: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
        reporter: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
        labels: [],
        sprint: null,
        _count: { comments: 0 },
    };

    describe('create', () => {
        it('should create a new task', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
            (prisma.task.aggregate as jest.Mock).mockResolvedValue({ _max: { orderIndex: 0 } });
            (prisma.task.create as jest.Mock).mockResolvedValue(mockTask);
            (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
            (prisma.activityLog.create as jest.Mock).mockResolvedValue({});

            const result = await taskService.create(
                {
                    title: 'Test Task',
                    description: 'Test Description',
                    projectId: 'project-123',
                    reporterId: 'user-123',
                },
                'user-123'
            );

            expect(result.title).toBe('Test Task');
            expect(prisma.task.create).toHaveBeenCalled();
            expect(prisma.activityLog.create).toHaveBeenCalled();
        });
    });

    describe('update', () => {
        it('should update an existing task', async () => {
            const updatedTask = { ...mockTask, title: 'Updated Task' };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
            (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
            (prisma.task.update as jest.Mock).mockResolvedValue(updatedTask);

            const result = await taskService.update(
                'task-123',
                { title: 'Updated Task' },
                'user-123'
            );

            expect(result.title).toBe('Updated Task');
        });
    });

    describe('list', () => {
        it('should list tasks with pagination', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (prisma.project.findMany as jest.Mock).mockResolvedValue([mockProject]);
            (prisma.task.findMany as jest.Mock).mockResolvedValue([mockTask]);
            (prisma.task.count as jest.Mock).mockResolvedValue(1);

            const result = await taskService.list(
                'user-123',
                {},
                { page: 1, limit: 20 }
            );

            expect(result.tasks).toHaveLength(1);
            expect(result.total).toBe(1);
        });

        it('should filter tasks by status', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (prisma.project.findMany as jest.Mock).mockResolvedValue([mockProject]);
            (prisma.task.findMany as jest.Mock).mockResolvedValue([mockTask]);
            (prisma.task.count as jest.Mock).mockResolvedValue(1);

            const result = await taskService.list(
                'user-123',
                { status: ['BACKLOG'] },
                { page: 1, limit: 20 }
            );

            expect(prisma.task.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        status: { in: ['BACKLOG'] },
                    }),
                })
            );
        });
    });

    describe('getByStatusForBoard', () => {
        it('should return tasks grouped by status', async () => {
            const taskInProgress = { ...mockTask, status: 'IN_PROGRESS' };
            const taskDone = { ...mockTask, status: 'DONE', id: 'task-456' };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
            (prisma.task.findMany as jest.Mock).mockResolvedValue([mockTask, taskInProgress, taskDone]);

            const result = await taskService.getByStatusForBoard('project-123', 'user-123');

            expect(result.BACKLOG).toHaveLength(1);
            expect(result.IN_PROGRESS).toHaveLength(1);
            expect(result.DONE).toHaveLength(1);
        });
    });

    describe('delete', () => {
        it('should delete a task', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (prisma.project.findFirst as jest.Mock).mockResolvedValue(mockProject);
            (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
            (prisma.task.delete as jest.Mock).mockResolvedValue(mockTask);

            await taskService.delete('task-123', 'user-123');

            expect(prisma.task.delete).toHaveBeenCalledWith({
                where: { id: 'task-123' },
            });
        });
    });
});
