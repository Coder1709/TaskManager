import { Router } from 'express';
import authRoutes from './auth.routes';
import taskRoutes from './task.routes';
import projectRoutes from './project.routes';
import reportRoutes from './report.routes';
import commentRoutes from './comment.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/projects', projectRoutes);
router.use('/reports', reportRoutes);
router.use('/comments', commentRoutes);

export default router;
