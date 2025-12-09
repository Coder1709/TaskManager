import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VerifyOtp from './pages/VerifyOtp';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import MyTasks from './pages/MyTasks';
import Board from './pages/Board';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

function PublicRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated } = useAuthStore();

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}

function App() {
    return (
        <Routes>
            {/* Public routes */}
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                }
            />
            <Route
                path="/signup"
                element={
                    <PublicRoute>
                        <Signup />
                    </PublicRoute>
                }
            />
            <Route
                path="/verify-otp"
                element={
                    <PublicRoute>
                        <VerifyOtp />
                    </PublicRoute>
                }
            />

            {/* Protected routes */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="projects" element={<Projects />} />
                <Route path="tasks" element={<MyTasks />} />
                <Route path="board/:projectId" element={<Board />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
