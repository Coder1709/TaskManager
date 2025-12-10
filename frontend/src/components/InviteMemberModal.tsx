import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Mail, Loader2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsApi } from '../services/api';

interface InviteMemberModalProps {
    projectId: string;
    onClose: () => void;
}

export default function InviteMemberModal({ projectId, onClose }: InviteMemberModalProps) {
    const queryClient = useQueryClient();
    const [email, setEmail] = useState('');

    const inviteMutation = useMutation({
        mutationFn: (email: string) => projectsApi.addMember(projectId, email),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
            toast.success('Member invited successfully');
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to invite member');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        inviteMutation.mutate(email);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Invite Member</h2>
                            <p className="text-sm text-gray-500">Add team members to this project</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="email"
                                className="input pl-11 w-full"
                                placeholder="colleague@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            They will be added to the project immediately.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={inviteMutation.isPending || !email}
                            className="btn btn-primary flex-1"
                        >
                            {inviteMutation.isPending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                'Send Invite'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
