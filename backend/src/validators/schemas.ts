import { z } from 'zod';

// Auth schemas
export const signupSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
        name: z.string().min(2, 'Name must be at least 2 characters'),
    }),
});

export const verifyOtpSchema = z.object({
    body: z.object({
        userId: z.string().uuid('Invalid user ID'),
        code: z.string().length(6, 'OTP must be 6 digits'),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(1, 'Password is required'),
    }),
});

export const refreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1, 'Refresh token is required'),
    }),
});

// Project schemas
export const createProjectSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Project name is required'),
        key: z.string().min(2, 'Project key must be at least 2 characters').max(10, 'Project key must be at most 10 characters'),
        description: z.string().optional(),
    }),
});

export const updateProjectSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
    }),
});

export const addMemberSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format'),
    }),
});

export const addMembersSchema = z.object({
    body: z.object({
        emails: z.array(z.string().email('Invalid email format')).min(1, 'At least one email required').max(20, 'Maximum 20 invites at a time'),
    }),
});

// Task schemas
export const createTaskSchema = z.object({
    body: z.object({
        title: z.string().min(1, 'Task title is required'),
        description: z.string().optional(),
        status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
        projectId: z.string().uuid('Invalid project ID'),
        assigneeId: z.string().uuid('Invalid assignee ID').optional().nullable(),
        dueDate: z.string().datetime().optional().nullable(),
        storyPoints: z.number().int().min(0).optional().nullable(),
        labelIds: z.array(z.string().uuid()).optional(),
        sprintId: z.string().uuid().optional().nullable(),
    }),
});

export const updateTaskSchema = z.object({
    body: z.object({
        title: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
        assigneeId: z.string().uuid().optional().nullable(),
        dueDate: z.string().datetime().optional().nullable(),
        storyPoints: z.number().int().min(0).optional().nullable(),
        labelIds: z.array(z.string().uuid()).optional(),
        sprintId: z.string().uuid().optional().nullable(),
    }),
});

export const updateTaskStatusSchema = z.object({
    body: z.object({
        status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
        orderIndex: z.number().int().min(0),
    }),
});

export const taskFiltersSchema = z.object({
    query: z.object({
        projectId: z.string().uuid().optional(),
        status: z.string().optional(), // Can be comma-separated
        priority: z.string().optional(), // Can be comma-separated
        assigneeId: z.string().uuid().optional(),
        reporterId: z.string().uuid().optional(),
        labelIds: z.string().optional(), // Comma-separated
        dueDateFrom: z.string().datetime().optional(),
        dueDateTo: z.string().datetime().optional(),
        search: z.string().optional(),
        sprintId: z.string().uuid().optional(),
        page: z.string().regex(/^\d+$/).optional(),
        limit: z.string().regex(/^\d+$/).optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
    }),
});

// Comment schemas
export const createCommentSchema = z.object({
    body: z.object({
        content: z.string().min(1, 'Comment content is required'),
    }),
});

export const updateCommentSchema = z.object({
    body: z.object({
        content: z.string().min(1, 'Comment content is required'),
    }),
});

// Label schemas
export const createLabelSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Label name is required'),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
    }),
});

// Report schemas
export const generateReportSchema = z.object({
    query: z.object({
        type: z.enum(['DAILY', 'WEEKLY']).optional(),
        date: z.string().datetime().optional(),
    }),
});

// User schemas
export const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().min(2).optional(),
        timezone: z.string().optional(),
    }),
});
