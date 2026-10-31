import { Request, Response, NextFunction } from 'express';
import { SportType } from '@prisma/client';
import { courtsService } from '../services/courts.service';
import { ApiResponse } from '../utils/apiResponse';

export class CourtsController {
  async getCourts(req: Request, res: Response, next: NextFunction) {
    try {
      const sport = req.query.sport as SportType | undefined;
      const activeOnly = req.query.active !== 'false';
      const courts = await courtsService.getAllCourts(sport, activeOnly);
      return ApiResponse.success(res, courts);
    } catch (err) {
      next(err);
    }
  }

  async getCourtBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      // Route param is named :slug in /slug/:slug and /:slug
      const slug = req.params.slug || req.params.id;
      const court = await courtsService.getCourtBySlug(slug);
      return ApiResponse.success(res, court);
    } catch (err) {
      next(err);
    }
  }

  async getCourtById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const court = await courtsService.getCourtById(id);
      return ApiResponse.success(res, court);
    } catch (err) {
      next(err);
    }
  }

  async getAmenities(_req: Request, res: Response, next: NextFunction) {
    try {
      const amenities = await courtsService.getAmenities();
      return ApiResponse.success(res, amenities);
    } catch (err) {
      next(err);
    }
  }

  async createCourt(req: Request, res: Response, next: NextFunction) {
    try {
      const court = await courtsService.createCourt(req.body);
      return ApiResponse.created(res, court, 'Court created successfully');
    } catch (err) {
      next(err);
    }
  }

  async updateCourt(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const court = await courtsService.updateCourt(id, req.body);
      return ApiResponse.success(res, court, 'Court updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const court = await courtsService.toggleActive(id);
      return ApiResponse.success(res, court, `Court ${court.isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (err) {
      next(err);
    }
  }
}

export const courtsController = new CourtsController();

