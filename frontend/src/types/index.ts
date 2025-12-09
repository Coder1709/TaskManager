export interface User {
    id: string;
    email: string;
    name: string;
    role: 'USER' | 'MANAGER' | 'ADMIN';
    timezone?: string;
}

export interface Project {
    id: string;
    name: string;
    key: string;
    description?: string;
    owner: Pick<User, 'id' | 'name' | 'email'>;
    members: Pick<User, 'id' | 'name' | 'email'>[];
    tasksCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface Label {
    id: string;
    name: string;
    color: string;
}

export interface Sprint {
    id: string;
    name: string;
}

export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Task {
    id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string;
    storyPoints?: number;
    orderIndex: number;
    project: Pick<Project, 'id' | 'name' | 'key'>;
    assignee?: Pick<User, 'id' | 'name' | 'email'>;
    reporter: Pick<User, 'id' | 'name' | 'email'>;
    labels: Label[];
    sprint?: Sprint;
    commentsCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface Comment {
    id: string;
    content: string;
    author: Pick<User, 'id' | 'name' | 'email'>;
    createdAt: string;
    updatedAt: string;
}

export interface Report {
    id: string;
    type: 'DAILY' | 'WEEKLY';
    summary: string;
    isAIGenerated?: boolean;
    data: {
        created: number;
        completed: number;
        inProgress: number;
        overdue: number;
        tasks: Array<{
            id: string;
            title: string;
            status: string;
            priority: string;
            project: string;
            dueDate?: string;
        }>;
    };
    createdAt: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    statusCode: number;
    meta?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    user: User;
}
