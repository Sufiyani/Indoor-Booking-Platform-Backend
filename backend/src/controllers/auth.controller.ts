import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { ApiResponse } from '../utils/apiResponse';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      authService.setAuthCookie(res, result.token);
      return ApiResponse.success(res, result, 'Logged in successfully');
    } catch (err) {
      next(err);
    }
  }

  async logout(_req: Request, res: Response, next: NextFunction) {
    try {
      authService.clearAuthCookie(res);
      return ApiResponse.success(res, null, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.admin) {
        return ApiResponse.unauthorized(res);
      }
      const admin = await authService.getAdminById(req.admin.adminId);
      return ApiResponse.success(res, admin);
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();

