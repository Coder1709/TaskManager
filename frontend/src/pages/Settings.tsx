import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { User, Mail, Globe, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

const TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney',
];

export default function Settings() {
    const { user, updateUser } = useAuthStore();
    const [formData, setFormData] = useState({
        name: user?.name || '',
        timezone: user?.timezone || 'UTC',
    });

    const updateMutation = useMutation({
        mutationFn: (data: { name?: string; timezone?: string }) => authApi.updateProfile(data),
        onSuccess: (response) => {
            updateUser(response.data.data);
            toast.success('Profile updated successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to update profile');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    return (
        <div className="max-w-2xl space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-500 mt-1">Manage your account settings</p>
            </div>

            {/* Profile Section */}
            <div className="card">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
                    <p className="text-sm text-gray-500">Update your personal information</p>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Email (read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="email"
                                className="input pl-11 bg-gray-50"
                                value={user?.email}
                                disabled
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                className="input pl-11"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Your name"
                            />
                        </div>
                    </div>

                    {/* Timezone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <select
                                className="input pl-11"
                                value={formData.timezone}
                                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                            >
                                {TIMEZONES.map((tz) => (
                                    <option key={tz} value={tz}>
                                        {tz}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Used for scheduling daily and weekly report emails
                        </p>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={updateMutation.isPending}
                            className="btn btn-primary"
                        >
                            {updateMutation.isPending ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : (
                                <Save className="w-5 h-5 mr-2" />
                            )}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>

            {/* Account Info */}
            <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
                <div className="space-y-4">
                    <div className="flex justify-between py-3 border-b border-gray-100">
                        <span className="text-gray-600">Role</span>
                        <span className="font-medium text-gray-900 capitalize">{user?.role?.toLowerCase()}</span>
                    </div>
                    <div className="flex justify-between py-3">
                        <span className="text-gray-600">Account Status</span>
                        <span className="inline-flex items-center gap-1 text-green-600">
                            <span className="w-2 h-2 bg-green-500 rounded-full" />
                            Verified
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
