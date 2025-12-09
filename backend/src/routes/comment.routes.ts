import { Router } from 'express';
import * as commentController from '../controllers/comment.controller';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { updateCommentSchema } from '../validators/schemas';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Comment routes (standalone, for update/delete)
router.patch('/:id', validate(updateCommentSchema), commentController.updateComment);
router.delete('/:id', commentController.deleteComment);

export default router;
