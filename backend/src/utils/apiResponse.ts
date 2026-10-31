import { Response } from 'express';

export interface ApiResponseData<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
  errors?: unknown;
}

export class ApiResponse {
  static success<T>(res: Response, data?: T, message = 'Success', statusCode = 200, meta?: ApiResponseData['meta']) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      meta,
    });
  }

  static created<T>(res: Response, data?: T, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  static error(res: Response, message = 'Internal Server Error', statusCode = 500, errors?: unknown) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  }

  static badRequest(res: Response, message = 'Bad Request', errors?: unknown) {
    return this.error(res, message, 400, errors);
  }

  static unauthorized(res: Response, message = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  static forbidden(res: Response, message = 'Forbidden') {
    return this.error(res, message, 403);
  }

  static notFound(res: Response, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  static conflict(res: Response, message = 'Conflict: Resource already exists or slot taken') {
    return this.error(res, message, 409);
  }

  static tooManyRequests(res: Response, message = 'Too many requests, please try again later') {
    return this.error(res, message, 429);
  }
}

