export interface ApiResponseType<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    statusCode: number;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
    };
    errors?: Array<{ field: string; message: string }>;
}

export class ApiResponse {
    static success<T>(data: T, statusCode: number = 200, meta?: ApiResponseType['meta']): ApiResponseType<T> {
        return {
            success: true,
            data,
            statusCode,
            ...(meta && { meta }),
        };
    }

    static error(
        message: string,
        statusCode: number = 500,
        errors?: Array<{ field: string; message: string }>
    ): ApiResponseType {
        return {
            success: false,
            error: message,
            statusCode,
            ...(errors && { errors }),
        };
    }

    static paginated<T>(
        data: T,
        page: number,
        limit: number,
        total: number
    ): ApiResponseType<T> {
        return {
            success: true,
            data,
            statusCode: 200,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
