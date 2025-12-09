import { Router } from 'express';
import * as taskController from '../controllers/task.controller';
import * as commentController from '../controllers/comment.controller';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
    createTaskSchema,
    updateTaskSchema,
    updateTaskStatusSchema,
    createCommentSchema,
    updateCommentSchema,
} from '../validators/schemas';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Task routes
router.post('/', validate(createTaskSchema), taskController.createTask);
router.get('/', taskController.listTasks);
router.get('/board/:projectId', taskController.getBoardTasks);
router.get('/:id', taskController.getTask);
router.patch('/:id', validate(updateTaskSchema), taskController.updateTask);
router.patch('/:id/status', validate(updateTaskStatusSchema), taskController.updateTaskStatus);
router.delete('/:id', taskController.deleteTask);

// Comment routes (nested under tasks)
router.post('/:taskId/comments', validate(createCommentSchema), commentController.createComment);
router.get('/:taskId/comments', commentController.getComments);

export default router;
