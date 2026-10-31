import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ApiResponse } from '../utils/apiResponse';

export class SettingsController {
  async getSettings(_req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
      return ApiResponse.success(res, settings);
    } catch (err) {
      next(err);
    }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await prisma.settings.upsert({
        where: { id: 'global' },
        update: req.body,
        create: { id: 'global', ...req.body },
      });
      return ApiResponse.success(res, updated, 'Settings updated successfully');
    } catch (err) {
      next(err);
    }
  }
}

export const settingsController = new SettingsController();

