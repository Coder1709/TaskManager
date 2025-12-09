import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    FolderKanban,
    Users,
    Trash2,
    Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsApi } from '../services/api';
import { Project } from '../types';

export default function Projects() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newProject, setNewProject] = useState({ name: '', key: '', description: '' });

    const { data, isLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectsApi.list(),
    });

    const createMutation = useMutation({
        mutationFn: (data: { name: string; key: string; description?: string }) =>
            projectsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setShowCreateModal(false);
            setNewProject({ name: '', key: '', description: '' });
            toast.success('Project created successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to create project');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => projectsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast.success('Project deleted');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to delete project');
        },
    });

    const projects: Project[] = data?.data?.data || [];

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(newProject);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
                    <p className="text-gray-500 mt-1">Manage your projects and teams</p>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
                    <Plus className="w-5 h-5 mr-2" />
                    New Project
                </button>
            </div>

            {/* Projects grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
            ) : projects.length === 0 ? (
                <div className="card p-12 text-center">
                    <FolderKanban className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                    <p className="text-gray-500 mb-4">Create your first project to get started</p>
                    <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
                        <Plus className="w-5 h-5 mr-2" />
                        Create Project
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            className="card p-6 hover:shadow-md transition-shadow cursor-pointer group"
                            onClick={() => navigate(`/board/${project.id}`)}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                                    <FolderKanban className="w-6 h-6 text-primary-600" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                        {project.key}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm('Delete this project?')) {
                                                deleteMutation.mutate(project.id);
                                            }
                                        }}
                                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-all"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </button>
                                </div>
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-1">{project.name}</h3>
                            {project.description && (
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{project.description}</p>
                            )}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Users className="w-4 h-4" />
                                    <span>{project.members.length} members</span>
                                </div>
                                <span className="text-sm text-gray-500">{project.tasksCount} tasks</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-6">Create Project</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Project name
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="My Awesome Project"
                                    value={newProject.name}
                                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Project key
                                </label>
                                <input
                                    type="text"
                                    className="input uppercase"
                                    placeholder="MAP"
                                    maxLength={10}
                                    value={newProject.key}
                                    onChange={(e) =>
                                        setNewProject({ ...newProject, key: e.target.value.toUpperCase() })
                                    }
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Used as prefix for task IDs (e.g., MAP-1)
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description (optional)
                                </label>
                                <textarea
                                    className="input resize-none"
                                    rows={3}
                                    placeholder="Brief description of the project"
                                    value={newProject.description}
                                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                />
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
                                        'Create Project'
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
