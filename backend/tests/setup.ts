import { PrismaClient } from '@prisma/client';

// Mock Prisma client
jest.mock('../src/config/database', () => ({
    __esModule: true,
    default: {
        user: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        otpToken: {
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
        },
        refreshToken: {
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
        },
        project: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        projectMember: {
            findUnique: jest.fn(),
            create: jest.fn(),
            createMany: jest.fn(),
            delete: jest.fn(),
        },
        task: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            aggregate: jest.fn(),
        },
        taskLabel: {
            createMany: jest.fn(),
            deleteMany: jest.fn(),
        },
        comment: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        activityLog: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
        label: {
            findMany: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        },
        report: {
            findMany: jest.fn(),
            create: jest.fn(),
        },
        $transaction: jest.fn((fn) => fn()),
    },
}));

// Reset mocks before each test
beforeEach(() => {
    jest.clearAllMocks();
});

// Cleanup after all tests
afterAll(async () => {
    // Any cleanup needed
});
