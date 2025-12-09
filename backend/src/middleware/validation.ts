import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { ApiResponse } from '../utils/response';

export const validate = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errors = error.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                }));
                res.status(400).json(ApiResponse.error('Validation failed', 400, errors));
                return;
            }
            next(error);
        }
    };
};
