import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2,
    Clock,
    AlertTriangle,
    TrendingUp,
    FolderKanban,
    ArrowRight,
} from 'lucide-react';
import { tasksApi, projectsApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Task, Project } from '../types';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const { data: tasksData } = useQuery({
        queryKey: ['my-tasks'],
        queryFn: () => tasksApi.list({ assigneeId: user?.id, limit: 100 }),
    });

    const { data: projectsData } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectsApi.list(),
    });

    const tasks: Task[] = tasksData?.data?.data || [];
    const projects: Project[] = projectsData?.data?.data || [];

    // Calculate stats
    const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const overdueTasks = tasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE'
    ).length;

    const stats = [
        {
            label: 'Completed',
            value: completedTasks,
            icon: CheckCircle2,
            color: 'bg-green-500',
            bgColor: 'bg-green-50',
            textColor: 'text-green-700',
        },
        {
            label: 'In Progress',
            value: inProgressTasks,
            icon: Clock,
            color: 'bg-yellow-500',
            bgColor: 'bg-yellow-50',
            textColor: 'text-yellow-700',
        },
        {
            label: 'Overdue',
            value: overdueTasks,
            icon: AlertTriangle,
            color: 'bg-red-500',
            bgColor: 'bg-red-50',
            textColor: 'text-red-700',
        },
        {
            label: 'Total Tasks',
            value: tasks.length,
            icon: TrendingUp,
            color: 'bg-primary-500',
            bgColor: 'bg-primary-50',
            textColor: 'text-primary-700',
        },
    ];

    const recentTasks = tasks
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Welcome back, {user?.name?.split(' ')[0]}
                </h1>
                <p className="text-gray-500 mt-1">Here's what's happening with your tasks.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="card p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">{stat.label}</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                            </div>
                            <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Tasks */}
                <div className="card">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Recent Tasks</h2>
                            <button
                                onClick={() => navigate('/tasks')}
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                            >
                                View all
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {recentTasks.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">No tasks yet</div>
                        ) : (
                            recentTasks.map((task) => (
                                <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-gray-900 truncate">{task.title}</p>
                                            <p className="text-sm text-gray-500 mt-1">{task.project.name}</p>
                                        </div>
                                        <span
                                            className={`badge ${task.status === 'DONE'
                                                    ? 'badge-done'
                                                    : task.status === 'IN_PROGRESS'
                                                        ? 'badge-in-progress'
                                                        : task.status === 'IN_REVIEW'
                                                            ? 'badge-in-review'
                                                            : 'badge-backlog'
                                                }`}
                                        >
                                            {task.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Projects */}
                <div className="card">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Your Projects</h2>
                            <button
                                onClick={() => navigate('/projects')}
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                            >
                                View all
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {projects.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">No projects yet</div>
                        ) : (
                            projects.slice(0, 5).map((project) => (
                                <div
                                    key={project.id}
                                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/board/${project.id}`)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                            <FolderKanban className="w-5 h-5 text-primary-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">{project.name}</p>
                                            <p className="text-sm text-gray-500">{project.tasksCount} tasks</p>
                                        </div>
                                        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                            {project.key}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
