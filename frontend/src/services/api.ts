import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const { accessToken } = useAuthStore.getState();
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const { refreshToken, logout, setAuth } = useAuthStore.getState();

            if (refreshToken) {
                try {
                    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        refreshToken,
                    });

                    const { accessToken: newAccessToken, refreshToken: newRefreshToken, user } = response.data.data;
                    setAuth(user, newAccessToken, newRefreshToken);

                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return api(originalRequest);
                } catch (refreshError) {
                    logout();
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                }
            } else {
                logout();
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    signup: (data: { email: string; password: string; name: string }) =>
        api.post('/auth/signup', data),

    verifyOtp: (data: { userId: string; code: string }) =>
        api.post('/auth/verify-otp', data),

    login: (data: { email: string; password: string }) =>
        api.post('/auth/login', data),

    logout: (refreshToken?: string) =>
        api.post('/auth/logout', { refreshToken }),

    getProfile: () => api.get('/auth/me'),

    updateProfile: (data: { name?: string; timezone?: string }) =>
        api.patch('/auth/me', data),
};

// Projects API
export const projectsApi = {
    list: () => api.get('/projects'),

    get: (id: string) => api.get(`/projects/${id}`),

    create: (data: { name: string; key: string; description?: string }) =>
        api.post('/projects', data),

    update: (id: string, data: { name?: string; description?: string }) =>
        api.patch(`/projects/${id}`, data),

    delete: (id: string) => api.delete(`/projects/${id}`),

    addMember: (id: string, email: string) =>
        api.post(`/projects/${id}/members`, { email }),

    addMembers: (id: string, emails: string[]) =>
        api.post(`/projects/${id}/members/batch`, { emails }),

    removeMember: (id: string, memberId: string) =>
        api.delete(`/projects/${id}/members/${memberId}`),

    getLabels: (id: string) => api.get(`/projects/${id}/labels`),

    createLabel: (id: string, data: { name: string; color: string }) =>
        api.post(`/projects/${id}/labels`, data),

    deleteLabel: (id: string, labelId: string) =>
        api.delete(`/projects/${id}/labels/${labelId}`),
};

// Tasks API
export const tasksApi = {
    list: (params?: {
        projectId?: string;
        status?: string;
        priority?: string;
        assigneeId?: string;
        search?: string;
        page?: number;
        limit?: number;
    }) => api.get('/tasks', { params }),

    get: (id: string) => api.get(`/tasks/${id}`),

    getBoard: (projectId: string) => api.get(`/tasks/board/${projectId}`),

    create: (data: {
        title: string;
        description?: string;
        status?: string;
        priority?: string;
        projectId: string;
        assigneeId?: string;
        dueDate?: string;
        storyPoints?: number;
        labelIds?: string[];
    }) => api.post('/tasks', data),

    update: (
        id: string,
        data: {
            title?: string;
            description?: string;
            status?: string;
            priority?: string;
            assigneeId?: string | null;
            dueDate?: string | null;
            storyPoints?: number | null;
            labelIds?: string[];
        }
    ) => api.patch(`/tasks/${id}`, data),

    updateStatus: (id: string, status: string, orderIndex: number) =>
        api.patch(`/tasks/${id}/status`, { status, orderIndex }),

    delete: (id: string) => api.delete(`/tasks/${id}`),

    // Comments
    getComments: (taskId: string) => api.get(`/tasks/${taskId}/comments`),

    addComment: (taskId: string, content: string) =>
        api.post(`/tasks/${taskId}/comments`, { content }),
};

// Comments API
export const commentsApi = {
    update: (id: string, content: string) =>
        api.patch(`/comments/${id}`, { content }),

    delete: (id: string) => api.delete(`/comments/${id}`),
};

// Reports API
export const reportsApi = {
    generateDaily: (date?: string) =>
        api.post('/reports/daily', { date }),

    generateWeekly: (date?: string) =>
        api.post('/reports/weekly', { date }),

    sendDailyEmail: () => api.post('/reports/send-daily'),

    sendWeeklyEmail: () => api.post('/reports/send-weekly'),

    getHistory: (params?: { type?: 'DAILY' | 'WEEKLY'; limit?: number }) =>
        api.get('/reports/history', { params }),

    getTeamReport: (params: { type: 'DAILY' | 'WEEKLY'; date?: string }) =>
        api.get('/reports/team', { params }),
};
