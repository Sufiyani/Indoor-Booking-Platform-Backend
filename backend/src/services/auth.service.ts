import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { AppError } from '../middlewares/error.middleware';

export class AuthService {
  async login(email: string, pass: string) {
    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!admin) {
      throw new AppError('Invalid email or password', 401);
    }

    const isValid = await bcrypt.compare(pass, admin.password);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = jwt.sign(
      {
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
      },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      token,
    };
  }

  setAuthCookie(res: Response, token: string) {
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  clearAuthCookie(res: Response) {
    res.clearCookie('admin_token', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }

  async getAdminById(id: string) {
    const admin = await prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!admin) {
      throw new AppError('Admin account not found', 404);
    }

    return admin;
  }
}

export const authService = new AuthService();

