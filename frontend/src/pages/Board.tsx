import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { ArrowLeft, Loader2, GripVertical, UserPlus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { tasksApi, projectsApi } from '../services/api';
import { Task, TaskStatus, Project } from '../types';
import InviteMemberModal from '../components/InviteMemberModal';
import TaskDetailsModal from '../components/TaskDetailsModal';
import ManageMembersModal from '../components/ManageMembersModal';
import { SEO } from '../components/SEO';

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
    { id: 'BACKLOG', title: 'Backlog', color: 'bg-gray-400' },
    { id: 'TODO', title: 'To Do', color: 'bg-blue-400' },
    { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-yellow-400' },
    { id: 'IN_REVIEW', title: 'In Review', color: 'bg-purple-400' },
    { id: 'DONE', title: 'Done', color: 'bg-green-400' },
];

interface TaskCardProps {
    task: Task;
    isDragging?: boolean;
    onTaskClick?: (task: Task) => void;
}

function TaskCard({ task, isDragging, onTaskClick }: TaskCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: task.id,
        data: { task },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const priorityColors = {
        LOW: 'border-l-gray-400',
        MEDIUM: 'border-l-blue-400',
        HIGH: 'border-l-orange-400',
        CRITICAL: 'border-l-red-500',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => !isDragging && onTaskClick?.(task)}
            className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm border-l-4 ${priorityColors[task.priority]
                } ${isDragging ? 'opacity-50' : 'hover:shadow-md cursor-pointer transition-shadow'}`}
        >
            <div className="flex items-start gap-2">
                <button
                    {...attributes}
                    {...listeners}
                    className="mt-1 cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-gray-100 rounded"
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical className="w-4 h-4 text-gray-400" />
                </button>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 font-medium mb-1">
                        {task.project.key}-{task.id.slice(0, 4).toUpperCase()}
                    </p>
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">{task.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                        {task.storyPoints && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {task.storyPoints} pts
                            </span>
                        )}
                    </div>
                    {task.assignee && (
                        <div className="mt-2 flex items-center gap-2">
                            <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-primary-700">
                                    {task.assignee.name.charAt(0)}
                                </span>
                            </div>
                            <span className="text-xs text-gray-500">{task.assignee.name}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Column({
    column,
    tasks,
    onTaskClick,
}: {
    column: (typeof COLUMNS)[0];
    tasks: Task[];
    onTaskClick: (task: Task) => void;
}) {
    return (
        <div className="flex flex-col w-72 flex-shrink-0">
            <div className="flex items-center gap-2 mb-3 px-2">
                <div className={`w-3 h-3 rounded-full ${column.color}`} />
                <h3 className="font-semibold text-gray-700">{column.title}</h3>
                <span className="ml-auto text-sm text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {tasks.length}
                </span>
            </div>
            <div className="flex-1 bg-gray-100 rounded-lg p-2 min-h-[500px]">
                <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                        {tasks.map((task) => (
                            <TaskCard key={task.id} task={task} onTaskClick={onTaskClick} />
                        ))}
                    </div>
                </SortableContext>
            </div>
        </div>
    );
}

export default function Board() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const { data: projectData } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => projectsApi.get(projectId!),
        enabled: !!projectId,
    });

    const { data: boardData, isLoading } = useQuery({
        queryKey: ['board', projectId],
        queryFn: () => tasksApi.getBoard(projectId!),
        enabled: !!projectId,
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ taskId, status, orderIndex }: { taskId: string; status: string; orderIndex: number }) =>
            tasksApi.updateStatus(taskId, status, orderIndex),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['board', projectId] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to update task');
            queryClient.invalidateQueries({ queryKey: ['board', projectId] });
        },
    });

    const project: Project = projectData?.data?.data;
    const boardTasks: Record<TaskStatus, Task[]> = boardData?.data?.data || {
        BACKLOG: [],
        TODO: [],
        IN_PROGRESS: [],
        IN_REVIEW: [],
        DONE: [],
    };

    const handleDragStart = (event: DragStartEvent) => {
        const task = event.active.data.current?.task;
        if (task) {
            setActiveTask(task);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) return;

        const taskId = active.id as string;
        const task = active.data.current?.task as Task;

        // Find which column we dropped into
        let newStatus: TaskStatus | null = null;
        for (const column of COLUMNS) {
            if (boardTasks[column.id].some((t) => t.id === over.id)) {
                newStatus = column.id;
                break;
            }
        }

        // If dropped on column itself (empty area)
        if (!newStatus) {
            for (const column of COLUMNS) {
                const columnElement = document.querySelector(`[data-column="${column.id}"]`);
                if (columnElement && over.id === column.id) {
                    newStatus = column.id;
                    break;
                }
            }
        }

        if (newStatus && newStatus !== task.status) {
            updateStatusMutation.mutate({
                taskId,
                status: newStatus,
                orderIndex: 0,
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <SEO
                title={project?.name || 'Board'}
                description={`Manage tasks for ${project?.name || 'your project'} on TaskFlow.`}
            />
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/projects')} className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{project?.name || 'Board'}</h1>
                        <p className="text-gray-500">{project?.key}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowMembersModal(true)}
                        className="btn btn-secondary"
                    >
                        <Users className="w-5 h-5 mr-2" />
                        Members
                    </button>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="btn btn-primary"
                    >
                        <UserPlus className="w-5 h-5 mr-2" />
                        Invite
                    </button>
                </div>
            </div>

            {/* Board */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {COLUMNS.map((column) => (
                        <Column
                            key={column.id}
                            column={column}
                            tasks={boardTasks[column.id]}
                            onTaskClick={(task) => setSelectedTaskId(task.id)}
                        />
                    ))}
                </div>
                <DragOverlay>
                    {activeTask && <TaskCard task={activeTask} isDragging />}
                </DragOverlay>
            </DndContext>

            {showInviteModal && projectId && (
                <InviteMemberModal
                    projectId={projectId}
                    onClose={() => setShowInviteModal(false)}
                />
            )}

            {showMembersModal && projectId && (
                <ManageMembersModal
                    projectId={projectId}
                    onClose={() => setShowMembersModal(false)}
                />
            )}

            {selectedTaskId && projectId && (
                <TaskDetailsModal
                    taskId={selectedTaskId}
                    projectId={projectId}
                    onClose={() => setSelectedTaskId(null)}
                />
            )}
        </div>
    );
}
