import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus,
    Search,
    Filter,
    Calendar,
    MessageSquare,
    Loader2,
    X,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { tasksApi, projectsApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Task, Project, TaskStatus, TaskPriority } from '../types';

const STATUS_OPTIONS: TaskStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const PRIORITY_OPTIONS: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function MyTasks() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        search: '',
    });

    const { data: projectsData } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectsApi.list(),
    });

    const projects: Project[] = projectsData?.data?.data || [];

    const { data: tasksData, isLoading } = useQuery({
        queryKey: ['my-tasks', filters],
        queryFn: () =>
            tasksApi.list({
                assigneeId: user?.id,
                status: filters.status || undefined,
                priority: filters.priority || undefined,
                search: filters.search || undefined,
                limit: 100,
            }),
    });

    const tasks: Task[] = tasksData?.data?.data || [];

    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        projectId: '',
        priority: 'MEDIUM' as TaskPriority,
        dueDate: '',
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => tasksApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
            setShowCreateModal(false);
            setNewTask({
                title: '',
                description: '',
                projectId: '',
                priority: 'MEDIUM',
                dueDate: '',
            });
            toast.success('Task created successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to create task');
        },
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({
            ...newTask,
            assigneeId: user?.id,
            dueDate: newTask.dueDate || undefined,
        });
    };

    const getStatusBadge = (status: TaskStatus) => {
        const badges: Record<TaskStatus, string> = {
            BACKLOG: 'badge-backlog',
            TODO: 'badge-todo',
            IN_PROGRESS: 'badge-in-progress',
            IN_REVIEW: 'badge-in-review',
            DONE: 'badge-done',
        };
        return badges[status];
    };

    const getPriorityBadge = (priority: TaskPriority) => {
        const badges: Record<TaskPriority, string> = {
            LOW: 'badge-low',
            MEDIUM: 'badge-medium',
            HIGH: 'badge-high',
            CRITICAL: 'badge-critical',
        };
        return badges[priority];
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
                    <p className="text-gray-500 mt-1">Tasks assigned to you</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-primary"
                    disabled={projects.length === 0}
                >
                    <Plus className="w-5 h-5 mr-2" />
                    New Task
                </button>
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                className="input pl-11"
                                placeholder="Search tasks..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>
                    </div>
                    <select
                        className="input w-auto"
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                        <option value="">All Statuses</option>
                        {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                                {status.replace('_', ' ')}
                            </option>
                        ))}
                    </select>
                    <select
                        className="input w-auto"
                        value={filters.priority}
                        onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                    >
                        <option value="">All Priorities</option>
                        {PRIORITY_OPTIONS.map((priority) => (
                            <option key={priority} value={priority}>
                                {priority}
                            </option>
                        ))}
                    </select>
                    {(filters.status || filters.priority || filters.search) && (
                        <button
                            onClick={() => setFilters({ status: '', priority: '', search: '' })}
                            className="btn btn-ghost"
                        >
                            <X className="w-4 h-4 mr-1" />
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Tasks List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
            ) : tasks.length === 0 ? (
                <div className="card p-12 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                    <p className="text-gray-500">
                        {filters.status || filters.priority || filters.search
                            ? 'Try adjusting your filters'
                            : 'Create your first task to get started'}
                    </p>
                </div>
            ) : (
                <div className="card divide-y divide-gray-100">
                    {tasks.map((task) => (
                        <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-xs font-medium text-gray-400">
                                            {task.project.key}-{task.id.slice(0, 4).toUpperCase()}
                                        </span>
                                        <span className={`badge ${getStatusBadge(task.status)}`}>
                                            {task.status.replace('_', ' ')}
                                        </span>
                                        <span className={`badge ${getPriorityBadge(task.priority)}`}>
                                            {task.priority}
                                        </span>
                                    </div>
                                    <h3 className="font-medium text-gray-900 mb-1">{task.title}</h3>
                                    {task.description && (
                                        <p className="text-sm text-gray-500 line-clamp-2">{task.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                                        <span>{task.project.name}</span>
                                        {task.dueDate && (
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {format(new Date(task.dueDate), 'MMM d, yyyy')}
                                            </span>
                                        )}
                                        {task.commentsCount > 0 && (
                                            <span className="flex items-center gap-1">
                                                <MessageSquare className="w-4 h-4" />
                                                {task.commentsCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-6">Create Task</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
                                <select
                                    className="input"
                                    value={newTask.projectId}
                                    onChange={(e) => setNewTask({ ...newTask, projectId: e.target.value })}
                                    required
                                >
                                    <option value="">Select project</option>
                                    {projects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name} ({project.key})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Task title"
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description (optional)
                                </label>
                                <textarea
                                    className="input resize-none"
                                    rows={3}
                                    placeholder="Task description"
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                                    <select
                                        className="input"
                                        value={newTask.priority}
                                        onChange={(e) =>
                                            setNewTask({ ...newTask, priority: e.target.value as TaskPriority })
                                        }
                                    >
                                        {PRIORITY_OPTIONS.map((priority) => (
                                            <option key={priority} value={priority}>
                                                {priority}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={newTask.dueDate}
                                        onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="btn btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="btn btn-primary flex-1"
                                >
                                    {createMutation.isPending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        'Create Task'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
