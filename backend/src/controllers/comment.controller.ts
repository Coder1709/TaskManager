import { Response, NextFunction } from 'express';
import { commentService } from '../services/comment.service';
import { ApiResponse } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

/**
 * @swagger
 * /api/tasks/{taskId}/comments:
 *   post:
 *     summary: Add comment to task
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added
 */
export const createComment = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const comment = await commentService.create(
            {
                content: req.body.content,
                taskId: req.params.taskId,
                authorId: req.user!.id,
            },
            req.user!.id
        );
        res.status(201).json(ApiResponse.success(comment, 201));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/tasks/{taskId}/comments:
 *   get:
 *     summary: Get task comments
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of comments
 */
export const getComments = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const comments = await commentService.getByTaskId(req.params.taskId, req.user!.id);
        res.status(200).json(ApiResponse.success(comments));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/comments/{id}:
 *   patch:
 *     summary: Update comment
 *     tags: [Comments]
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
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment updated
 */
export const updateComment = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const comment = await commentService.update(req.params.id, req.body.content, req.user!.id);
        res.status(200).json(ApiResponse.success(comment));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Delete comment
 *     tags: [Comments]
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
 *         description: Comment deleted
 */
export const deleteComment = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        await commentService.delete(req.params.id, req.user!.id);
        res.status(200).json(ApiResponse.success({ message: 'Comment deleted successfully' }));
    } catch (error) {
        next(error);
    }
};
