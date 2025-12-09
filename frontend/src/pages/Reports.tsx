import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    FileText,
    Send,
    RefreshCw,
    Calendar,
    Sparkles,
    Loader2,
    CheckCircle2,
    Clock,
    AlertTriangle,
    TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { reportsApi } from '../services/api';
import { Report } from '../types';

type TabType = 'DAILY' | 'WEEKLY';

export default function Reports() {
    const [activeTab, setActiveTab] = useState<TabType>('DAILY');

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['reports', activeTab],
        queryFn: () => reportsApi.getHistory({ type: activeTab, limit: 10 }),
    });

    const generateDailyMutation = useMutation({
        mutationFn: () => reportsApi.generateDaily(),
        onSuccess: () => {
            refetch();
            toast.success('Daily report generated!');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to generate report');
        },
    });

    const generateWeeklyMutation = useMutation({
        mutationFn: () => reportsApi.generateWeekly(),
        onSuccess: () => {
            refetch();
            toast.success('Weekly report generated!');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to generate report');
        },
    });

    const sendEmailMutation = useMutation({
        mutationFn: (type: TabType) =>
            type === 'DAILY' ? reportsApi.sendDailyEmail() : reportsApi.sendWeeklyEmail(),
        onSuccess: () => {
            toast.success('Report email sent!');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to send email');
        },
    });

    const reports: Report[] = data?.data?.data || [];

    const handleGenerate = () => {
        if (activeTab === 'DAILY') {
            generateDailyMutation.mutate();
        } else {
            generateWeeklyMutation.mutate();
        }
    };

    const isGenerating = generateDailyMutation.isPending || generateWeeklyMutation.isPending;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
                    <p className="text-gray-500 mt-1">View and generate task summaries</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="btn btn-secondary"
                    >
                        {isGenerating ? (
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                            <RefreshCw className="w-5 h-5 mr-2" />
                        )}
                        Generate Now
                    </button>
                    <button
                        onClick={() => sendEmailMutation.mutate(activeTab)}
                        disabled={sendEmailMutation.isPending}
                        className="btn btn-primary"
                    >
                        {sendEmailMutation.isPending ? (
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                            <Send className="w-5 h-5 mr-2" />
                        )}
                        Send Email
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('DAILY')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'DAILY'
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Daily Reports
                </button>
                <button
                    onClick={() => setActiveTab('WEEKLY')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'WEEKLY'
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Weekly Reports
                </button>
            </div>

            {/* Reports List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
            ) : reports.length === 0 ? (
                <div className="card p-12 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No reports yet</h3>
                    <p className="text-gray-500 mb-4">Generate your first {activeTab.toLowerCase()} report</p>
                    <button onClick={handleGenerate} disabled={isGenerating} className="btn btn-primary">
                        {isGenerating ? (
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                            <RefreshCw className="w-5 h-5 mr-2" />
                        )}
                        Generate Report
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {reports.map((report) => (
                        <div key={report.id} className="card overflow-hidden">
                            {/* Report Header */}
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-primary-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">
                                                {report.type === 'DAILY' ? 'Daily' : 'Weekly'} Summary
                                            </h3>
                                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {format(new Date(report.createdAt), 'PPP p')}
                                            </p>
                                        </div>
                                    </div>
                                    {report.isAIGenerated && (
                                        <span className="flex items-center gap-1 text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                                            <Sparkles className="w-3 h-3" />
                                            AI Generated
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-4 gap-4 p-6 bg-gray-50 border-b border-gray-100">
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                        <span className="text-2xl font-bold text-gray-900">
                                            {report.data.completed}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">Completed</p>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <TrendingUp className="w-5 h-5 text-primary-500" />
                                        <span className="text-2xl font-bold text-gray-900">{report.data.created}</span>
                                    </div>
                                    <p className="text-xs text-gray-500">Created</p>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <Clock className="w-5 h-5 text-yellow-500" />
                                        <span className="text-2xl font-bold text-gray-900">
                                            {report.data.inProgress}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">In Progress</p>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <AlertTriangle className="w-5 h-5 text-red-500" />
                                        <span className="text-2xl font-bold text-gray-900">{report.data.overdue}</span>
                                    </div>
                                    <p className="text-xs text-gray-500">Overdue</p>
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="p-6">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Summary</h4>
                                <div className="bg-gradient-to-r from-gray-50 to-primary-50 border-l-4 border-primary-500 rounded-r-lg p-4">
                                    <p className="text-gray-700 leading-relaxed">{report.summary}</p>
                                </div>
                            </div>

                            {/* Task List */}
                            {report.data.tasks.length > 0 && (
                                <div className="px-6 pb-6">
                                    <h4 className="text-sm font-medium text-gray-700 mb-3">Tasks</h4>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Task</th>
                                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Project</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {report.data.tasks.slice(0, 5).map((task: any, i: number) => (
                                                    <tr key={i} className="hover:bg-gray-50">
                                                        <td className="px-4 py-2 text-gray-900">{task.title}</td>
                                                        <td className="px-4 py-2">
                                                            <span className="badge badge-backlog">
                                                                {task.status.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 text-gray-500">{task.project}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {report.data.tasks.length > 5 && (
                                            <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500 text-center">
                                                +{report.data.tasks.length - 5} more tasks
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
