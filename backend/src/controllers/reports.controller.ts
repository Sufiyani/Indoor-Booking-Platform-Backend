import { Request, Response, NextFunction } from 'express';
import { reportsService } from '../services/reports.service';
import { ApiResponse } from '../utils/apiResponse';

export class ReportsController {
  async getRevenueReport(req: Request, res: Response, next: NextFunction) {
    try {
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 14;
      const data = await reportsService.getRevenueReport(days);
      return ApiResponse.success(res, data);
    } catch (err) {
      next(err);
    }
  }

  async exportBookingsCsv(_req: Request, res: Response, next: NextFunction) {
    try {
      const csv = await reportsService.exportBookingsCsv();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="indoor-arena-bookings-${Date.now()}.csv"`);
      return res.send(csv);
    } catch (err) {
      next(err);
    }
  }
}

export const reportsController = new ReportsController();

