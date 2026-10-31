import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ApiResponse } from '../utils/apiResponse';

export class AppError extends Error {
  statusCode: number;
  errors?: unknown;

  constructor(message: string, statusCode = 500, errors?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // If headers are already sent, delegate to default express error handler
  if (res.headersSent) {
    return _next(err);
  }

  // Zod Validation Error
  if (err instanceof ZodError) {
    const formatted = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return ApiResponse.badRequest(res, 'Validation error', formatted);
  }

  // Custom AppError
  if (err instanceof AppError) {
    return ApiResponse.error(res, err.message, err.statusCode, err.errors);
  }

  // Prisma Unique Constraint Error (P2002)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[]) || [];
      return ApiResponse.conflict(
        res,
        `Conflict: A record with this ${target.join(', ')} already exists or the slot was just booked by another user.`
      );
    }
    if (err.code === 'P2025') {
      return ApiResponse.notFound(res, 'Requested resource not found');
    }
  }

  console.error('🔥 Unhandled Error:', err);
  return ApiResponse.error(
    res,
    process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred' : err.message,
    500
  );
}

