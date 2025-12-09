import dotenv from 'dotenv';

dotenv.config();

export const config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),

    database: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/litejira',
    },

    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
        accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
        refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    },

    email: {
        provider: process.env.EMAIL_PROVIDER || 'smtp',
        from: process.env.EMAIL_FROM || 'noreply@litejira.com',
        sendgrid: {
            apiKey: process.env.SENDGRID_API_KEY || '',
        },
        smtp: {
            host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || '',
        },
    },

    gemini: {
        apiKey: process.env.GEMINI_API_KEY || '',
    },

    frontend: {
        url: process.env.FRONTEND_URL || 'http://localhost:5173',
    },

    otp: {
        expiryMinutes: 10,
        length: 6,
    },
};
