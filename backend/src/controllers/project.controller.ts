import { Response, NextFunction } from 'express';
import { projectService } from '../services/project.service';
import { ApiResponse } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, key]
 *             properties:
 *               name:
 *                 type: string
 *               key:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Project created
 */
export const createProject = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const project = await projectService.create({
            ...req.body,
            ownerId: req.user!.id,
        });
        res.status(201).json(ApiResponse.success(project, 201));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: List all projects user has access to
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of projects
 */
export const listProjects = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const projects = await projectService.list(req.user!.id);
        res.status(200).json(ApiResponse.success(projects));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
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
 *         description: Project details
 */
export const getProject = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const project = await projectService.getById(req.params.id, req.user!.id);
        if (!project) {
            res.status(404).json(ApiResponse.error('Project not found', 404));
            return;
        }
        res.status(200).json(ApiResponse.success(project));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/projects/{id}:
 *   patch:
 *     summary: Update project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated project
 */
export const updateProject = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const project = await projectService.update(req.params.id, req.body, req.user!.id);
        res.status(200).json(ApiResponse.success(project));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Delete project
 *     tags: [Projects]
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
 *         description: Project deleted
 */
export const deleteProject = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        await projectService.delete(req.params.id, req.user!.id);
        res.status(200).json(ApiResponse.success({ message: 'Project deleted successfully' }));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/projects/{id}/members:
 *   post:
 *     summary: Add member to project
 *     tags: [Projects]
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
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Member added
 */
export const addMember = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const project = await projectService.addMember(req.params.id, req.body.email, req.user!.id);
        res.status(200).json(ApiResponse.success(project));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/projects/{id}/members/batch:
 *   post:
 *     summary: Add multiple members to project at once
 *     tags: [Projects]
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
 *             required: [emails]
 *             properties:
 *               emails:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *     responses:
 *       200:
 *         description: Batch invitation results
 */
export const addMembers = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const result = await projectService.addMembers(req.params.id, req.body.emails, req.user!.id);
        res.status(200).json(ApiResponse.success(result));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/projects/{id}/members/{memberId}:
 *   delete:
 *     summary: Remove member from project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed
 */
export const removeMember = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const project = await projectService.removeMember(
            req.params.id,
            req.params.memberId,
            req.user!.id
        );
        res.status(200).json(ApiResponse.success(project));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/projects/{id}/labels:
 *   get:
 *     summary: Get project labels
 *     tags: [Projects]
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
 *         description: List of labels
 */
export const getLabels = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const labels = await projectService.getLabels(req.params.id, req.user!.id);
        res.status(200).json(ApiResponse.success(labels));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/projects/{id}/labels:
 *   post:
 *     summary: Create project label
 *     tags: [Projects]
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
 *             required: [name, color]
 *             properties:
 *               name:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       201:
 *         description: Label created
 */
export const createLabel = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const label = await projectService.createLabel(
            req.params.id,
            req.body.name,
            req.body.color,
            req.user!.id
        );
        res.status(201).json(ApiResponse.success(label, 201));
    } catch (error) {
        next(error);
    }
};

/**
 * @swagger
 * /api/projects/{id}/labels/{labelId}:
 *   delete:
 *     summary: Delete project label
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: labelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Label deleted
 */
export const deleteLabel = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        await projectService.deleteLabel(req.params.labelId, req.user!.id);
        res.status(200).json(ApiResponse.success({ message: 'Label deleted successfully' }));
    } catch (error) {
        next(error);
    }
};
