import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Users, Loader2, Trash2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Project } from '../types';

interface ManageMembersModalProps {
    projectId: string;
    onClose: () => void;
}

export default function ManageMembersModal({ projectId, onClose }: ManageMembersModalProps) {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    const { data: projectData, isLoading } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => projectsApi.get(projectId),
    });

    const project: Project = projectData?.data?.data;

    const removeMemberMutation = useMutation({
        mutationFn: (memberId: string) => projectsApi.removeMember(projectId, memberId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
            toast.success('Member removed');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to remove member');
        },
    });

    if (isLoading || !project) {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
        );
    }

    const isOwner = project.owner.id === user?.id;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Team Members</h2>
                            <p className="text-sm text-gray-500">{project.members.length} members in this project</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Owner */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-700 font-medium">
                                {project.owner.name.charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">{project.owner.name}</p>
                                <p className="text-xs text-gray-500">Project Owner</p>
                            </div>
                        </div>
                        <Shield className="w-4 h-4 text-yellow-500" />
                    </div>

                    {/* Members */}
                    {project.members
                        .filter((member) => member.id !== project.owner.id)
                        .map((member) => (
                            <div
                                key={member.id}
                                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-medium">
                                        {member.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                                        <p className="text-xs text-gray-500">{member.email}</p>
                                    </div>
                                </div>
                                {isOwner && (
                                    <button
                                        onClick={() => {
                                            if (confirm(`Remove ${member.name} from project?`)) {
                                                removeMemberMutation.mutate(member.id);
                                            }
                                        }}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}

                    {project.members.length === 1 && (
                        <div className="text-center py-6 text-gray-500 text-sm">
                            No other members yet. Invite someone!
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end">
                    <button onClick={onClose} className="btn btn-secondary w-full">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
