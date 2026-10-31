import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiResponse } from '../utils/apiResponse';
import { prisma } from '../config/prisma';

export interface AdminPayload {
  adminId: string;
  email: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminPayload;
    }
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Read token from httpOnly cookie or Authorization Bearer header
    let token = req.cookies?.admin_token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return ApiResponse.unauthorized(res, 'Authentication required. Please sign in as admin.');
    }

    // 2. Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET) as AdminPayload;

    // 3. Verify admin exists in database
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.adminId },
      select: { id: true, email: true, role: true },
    });

    if (!admin) {
      return ApiResponse.unauthorized(res, 'Admin account not found or invalid session.');
    }

    req.admin = {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    };

    return next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return ApiResponse.unauthorized(res, 'Session expired. Please log in again.');
    }
    return ApiResponse.unauthorized(res, 'Invalid authentication token.');
  }
}

