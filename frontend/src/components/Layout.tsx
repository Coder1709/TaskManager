import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    FolderKanban,
    CheckSquare,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/projects', label: 'Projects', icon: FolderKanban },
    { path: '/tasks', label: 'My Tasks', icon: CheckSquare },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
    const navigate = useNavigate();
    const { user, logout, refreshToken } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await authApi.logout(refreshToken || undefined);
        } catch {
            // Ignore logout errors
        }
        logout();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                                <CheckSquare className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">TaskFlow</span>
                        </div>
                        <button
                            className="lg:hidden p-1 hover:bg-gray-100 rounded"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? 'bg-primary-50 text-primary-700'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`
                                }
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* User section */}
                    <div className="p-4 border-t border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                <span className="text-primary-700 font-semibold">
                                    {user?.name?.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-8">
                    <button
                        className="lg:hidden p-2 hover:bg-gray-100 rounded-lg mr-4"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex-1" />
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 lg:p-8 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
