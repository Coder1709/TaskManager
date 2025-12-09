import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function VerifyOtp() {
    const location = useLocation();
    const navigate = useNavigate();
    const { setAuth } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const userId = location.state?.userId;
    const email = location.state?.email;

    useEffect(() => {
        if (!userId) {
            navigate('/signup');
        }
    }, [userId, navigate]);

    const handleChange = (index: number, value: string) => {
        if (value.length > 1) {
            value = value[0];
        }

        if (!/^\d*$/.test(value)) {
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Move to next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (/^\d+$/.test(pastedData)) {
            const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
            setOtp(newOtp);
            inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = otp.join('');

        if (code.length !== 6) {
            toast.error('Please enter the 6-digit code');
            return;
        }

        setLoading(true);

        try {
            const response = await authApi.verifyOtp({ userId, code });
            const { accessToken, refreshToken, user } = response.data.data;
            setAuth(user, accessToken, refreshToken);
            toast.success('Email verified successfully!');
            navigate('/dashboard');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    if (!userId) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-lg shadow-primary-500/30 mb-4">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Verify Email</h1>
                    <p className="text-gray-500 mt-2">
                        We sent a 6-digit code to<br />
                        <span className="text-gray-700 font-medium">{email}</span>
                    </p>
                </div>

                {/* Form */}
                <div className="card p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
                                Enter verification code
                            </label>
                            <div className="flex justify-center gap-3" onPaste={handlePaste}>
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => (inputRefs.current[index] = el)}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        className="w-12 h-14 text-center text-2xl font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        value={digit}
                                        onChange={(e) => handleChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                    />
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || otp.join('').length !== 6}
                            className="btn btn-primary w-full py-3"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <ShieldCheck className="w-5 h-5 mr-2" />
                                    Verify Email
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-gray-600">
                        Didn't receive the code?{' '}
                        <button className="text-primary-600 hover:text-primary-700 font-medium">
                            Resend
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
