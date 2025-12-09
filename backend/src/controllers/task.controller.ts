import { Response, NextFunction } from 'express';
import { taskService } from '../services/task.service';
import { ApiResponse } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { TaskStatus, TaskPriority } from '@prisma/client';

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, projectId]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE]
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               assigneeId:
 *                 type: string
 *                 format: uuid
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               storyPoints:
 *                 type: integer
 *               labelIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       201:
 *         description: Task created
 */
export const createTask = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const task = await taskService.create(
            {
                ...req.body,
                reporterId: req.user!.id,
                dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
            },
            req.user!.id
        );
        res.status(201).json(ApiResponse.success(task, 201));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: List tasks with filters
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *       - in: query
 *         name: assigneeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of tasks
 */
export const listTasks = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const filters = {
            projectId: req.query.projectId as string | undefined,
            status: req.query.status
                ? (req.query.status as string).split(',') as TaskStatus[]
                : undefined,
            priority: req.query.priority
                ? (req.query.priority as string).split(',') as TaskPriority[]
                : undefined,
            assigneeId: req.query.assigneeId as string | undefined,
            reporterId: req.query.reporterId as string | undefined,
            labelIds: req.query.labelIds
                ? (req.query.labelIds as string).split(',')
                : undefined,
            dueDateFrom: req.query.dueDateFrom
                ? new Date(req.query.dueDateFrom as string)
                : undefined,
            dueDateTo: req.query.dueDateTo
                ? new Date(req.query.dueDateTo as string)
                : undefined,
            search: req.query.search as string | undefined,
            sprintId: req.query.sprintId as string | undefined,
        };

        const pagination = {
            page: parseInt(req.query.page as string) || 1,
            limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
            sortBy: (req.query.sortBy as string) || 'createdAt',
            sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
        };

        const result = await taskService.list(req.user!.id, filters, pagination);
        res.status(200).json(
            ApiResponse.paginated(result.tasks, pagination.page, pagination.limit, result.total)
        );
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Task details
 *       404:
 *         description: Task not found
 */
export const getTask = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const task = await taskService.getById(req.params.id, req.user!.id);
        if (!task) {
            res.status(404).json(ApiResponse.error('Task not found', 404));
            return;
        }
        res.status(200).json(ApiResponse.success(task));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/tasks/{id}:
 *   patch:
 *     summary: Update task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *               priority:
 *                 type: string
 *               assigneeId:
 *                 type: string
 *               dueDate:
 *                 type: string
 *               storyPoints:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Updated task
 */
export const updateTask = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const task = await taskService.update(
            req.params.id,
            {
                ...req.body,
                dueDate: req.body.dueDate ? new Date(req.body.dueDate) : req.body.dueDate,
            },
            req.user!.id
        );
        res.status(200).json(ApiResponse.success(task));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/tasks/{id}/status:
 *   patch:
 *     summary: Update task status (for board drag-and-drop)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status, orderIndex]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE]
 *               orderIndex:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Task status updated
 */
export const updateTaskStatus = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { status, orderIndex } = req.body;
        const task = await taskService.updateStatus(req.params.id, status, orderIndex, req.user!.id);
        res.status(200).json(ApiResponse.success(task));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted
 */
export const deleteTask = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        await taskService.delete(req.params.id, req.user!.id);
        res.status(200).json(ApiResponse.success({ message: 'Task deleted successfully' }));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/tasks/board/{projectId}:
 *   get:
 *     summary: Get tasks grouped by status for board view
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tasks grouped by status
 */
export const getBoardTasks = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const tasks = await taskService.getByStatusForBoard(req.params.projectId, req.user!.id);
        res.status(200).json(ApiResponse.success(tasks));
    } catch (error) {
        next(error);
    }
};
