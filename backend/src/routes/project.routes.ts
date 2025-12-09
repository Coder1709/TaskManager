import { Router } from 'express';
import * as projectController from '../controllers/project.controller';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
    createProjectSchema,
    updateProjectSchema,
    addMemberSchema,
    addMembersSchema,
    createLabelSchema,
} from '../validators/schemas';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Project routes
router.post('/', validate(createProjectSchema), projectController.createProject);
router.get('/', projectController.listProjects);
router.get('/:id', projectController.getProject);
router.patch('/:id', validate(updateProjectSchema), projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

// Member routes
router.post('/:id/members', validate(addMemberSchema), projectController.addMember);
router.post('/:id/members/batch', validate(addMembersSchema), projectController.addMembers);
router.delete('/:id/members/:memberId', projectController.removeMember);

// Label routes
router.get('/:id/labels', projectController.getLabels);
router.post('/:id/labels', validate(createLabelSchema), projectController.createLabel);
router.delete('/:id/labels/:labelId', projectController.deleteLabel);

export default router;
