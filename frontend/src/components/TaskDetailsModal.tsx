import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    X,
    Calendar,
    Flag,
    CheckCircle2,
    User as UserIcon,
    Trash2,
    Send,
    Loader2,
    MessageSquare,
    Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { tasksApi, commentsApi, projectsApi } from '../services/api';
import { Task, TaskPriority, TaskStatus, Comment, Project } from '../types';
import { useAuthStore } from '../store/authStore';

interface TaskDetailsModalProps {
    taskId: string;
    projectId: string;
    onClose: () => void;
}

export default function TaskDetailsModal({ taskId, projectId, onClose }: TaskDetailsModalProps) {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [newComment, setNewComment] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    // Fetch Task Details
    const { data: taskData, isLoading: isTaskLoading } = useQuery({
        queryKey: ['task', taskId],
        queryFn: () => tasksApi.get(taskId),
    });

    // Fetch Comments
    const { data: commentsData, isLoading: isCommentsLoading } = useQuery({
        queryKey: ['comments', taskId],
        queryFn: () => tasksApi.getComments(taskId),
    });

    // Fetch Project Members (for assignee dropdown)
    const { data: projectData } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => projectsApi.get(projectId),
    });

    const task: Task = taskData?.data?.data;
    const comments: Comment[] = commentsData?.data?.data || [];
    const project: Project = projectData?.data?.data;

    // Initialize local state when data loads
    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
        }
    }, [task]);

    // Mutations
    const updateTaskMutation = useMutation({
        mutationFn: (data: Partial<Task>) => tasksApi.update(taskId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task', taskId] });
            queryClient.invalidateQueries({ queryKey: ['board', projectId] });
            toast.success('Task updated');
            setIsEditingTitle(false);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to update task');
        },
    });

    const deleteTaskMutation = useMutation({
        mutationFn: () => tasksApi.delete(taskId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['board', projectId] });
            toast.success('Task deleted');
            onClose();
        },
    });

    const addCommentMutation = useMutation({
        mutationFn: (content: string) => tasksApi.addComment(taskId, content),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
            setNewComment('');
            toast.success('Comment added');
        },
    });

    const deleteCommentMutation = useMutation({
        mutationFn: (commentId: string) => commentsApi.delete(commentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
            toast.success('Comment deleted');
        },
    });

    const handleUpdate = (field: keyof Task, value: any) => {
        if (task[field] === value) return;
        updateTaskMutation.mutate({ [field]: value });
    };

    if (isTaskLoading || !task) {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
        );
    }

    const priorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const statuses: TaskStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-gray-100">
                    <div className="flex-1 mr-8">
                        <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
                            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">
                                {project?.key}-{task.id.slice(0, 4).toUpperCase()}
                            </span>
                            <span>in {project?.name}</span>
                        </div>
                        {isEditingTitle ? (
                            <input
                                autoFocus
                                className="text-2xl font-bold text-gray-900 w-full border-b-2 border-primary-500 focus:outline-none"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onBlur={() => handleUpdate('title', title)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUpdate('title', title);
                                }}
                            />
                        ) : (
                            <h2
                                onClick={() => setIsEditingTitle(true)}
                                className="text-2xl font-bold text-gray-900 hover:bg-gray-50 rounded px-2 -ml-2 cursor-pointer transition-colors"
                            >
                                {task.title}
                            </h2>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (confirm('Are you sure you want to delete this task?')) {
                                    deleteTaskMutation.mutate();
                                }
                            }}
                            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                            title="Delete Task"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Main Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Description */}
                        <div className="group">
                            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                Description
                            </h3>
                            <textarea
                                className="w-full min-h-[120px] p-3 text-gray-700 bg-gray-50 hover:bg-white border-2 border-transparent hover:border-gray-200 focus:border-primary-500 transition-all rounded-lg resize-none focus:outline-none focus:bg-white"
                                placeholder="Add a description..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onBlur={() => handleUpdate('description', description)}
                            />
                        </div>

                        {/* Comments System */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                Comments ({comments.length})
                            </h3>

                            <div className="flex gap-3 mb-6">
                                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-sm font-medium text-primary-700">
                                        {user?.name?.charAt(0)}
                                    </span>
                                </div>
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                        placeholder="Write a comment..."
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newComment.trim()) {
                                                addCommentMutation.mutate(newComment);
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => newComment.trim() && addCommentMutation.mutate(newComment)}
                                        disabled={!newComment.trim() || addCommentMutation.isPending}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary-600 hover:bg-primary-50 rounded-md transition-colors disabled:opacity-50"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {isCommentsLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                    </div>
                                ) : (
                                    comments.map((comment) => (
                                        <div key={comment.id} className="flex gap-3 group">
                                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                <span className="text-sm font-medium text-gray-600">
                                                    {comment.author?.name?.charAt(0)}
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-gray-900 text-sm">
                                                            {comment.author?.name}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                                                        </span>
                                                    </div>
                                                    {user?.id === comment.authorId && (
                                                        <button
                                                            onClick={() => deleteCommentMutation.mutate(comment.id)}
                                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="mt-1 text-gray-700 text-sm bg-gray-50 p-2.5 rounded-r-lg rounded-bl-lg">
                                                    {comment.content}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-gray-100 bg-gray-50/50 p-6 space-y-6 overflow-y-auto">
                        {/* Status */}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">
                                Status
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 cursor-pointer hover:border-gray-300 focus:border-primary-500 focus:outline-none"
                                    value={task.status}
                                    onChange={(e) => handleUpdate('status', e.target.value)}
                                >
                                    {statuses.map((s) => (
                                        <option key={s} value={s}>
                                            {s.replace('_', ' ')}
                                        </option>
                                    ))}
                                </select>
                                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">
                                Priority
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 cursor-pointer hover:border-gray-300 focus:border-primary-500 focus:outline-none"
                                    value={task.priority}
                                    onChange={(e) => handleUpdate('priority', e.target.value)}
                                >
                                    {priorities.map((p) => (
                                        <option key={p} value={p}>
                                            {p}
                                        </option>
                                    ))}
                                </select>
                                <Flag className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${task.priority === 'CRITICAL' ? 'text-red-500' :
                                    task.priority === 'HIGH' ? 'text-orange-500' :
                                        'text-gray-400'
                                    }`} />
                            </div>
                        </div>

                        {/* Assignee */}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">
                                Assignee
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 cursor-pointer hover:border-gray-300 focus:border-primary-500 focus:outline-none"
                                    value={task.assigneeId || ''}
                                    onChange={(e) => handleUpdate('assigneeId', e.target.value || null)}
                                >
                                    <option value="">Unassigned</option>
                                    {project?.members?.map((member) => (
                                        <option key={member.id} value={member.id}>
                                            {member.name}
                                        </option>
                                    ))}
                                </select>
                                <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Due Date */}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">
                                Due Date
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 cursor-pointer hover:border-gray-300 focus:border-primary-500 focus:outline-none"
                                    value={task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''}
                                    onChange={(e) => handleUpdate('dueDate', e.target.value || null)}
                                />
                                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Metadata */}
                        <div className="pt-6 border-t border-gray-200 space-y-3">
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Created</span>
                                <span>{format(new Date(task.createdAt), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Updated</span>
                                <span>{format(new Date(task.updatedAt), 'MMM d, yyyy')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
