import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';
import { bookingsService } from '../services/bookings.service';
import { prisma } from '../config/prisma';
import { ApiResponse } from '../utils/apiResponse';

export class AdminController {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getDashboardStats();
      return ApiResponse.success(res, stats);
    } catch (err) {
      next(err);
    }
  }

  async getBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const { date, courtId, sport, status, search, page, limit } = req.query as any;
      const result = await adminService.getBookings({
        date,
        courtId,
        sport,
        status,
        search,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 15,
      });
      return ApiResponse.success(res, result.bookings, 'Bookings retrieved', 200, result.meta);
    } catch (err) {
      next(err);
    }
  }

  async updateBookingStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { action, reason } = req.body;
      const updated = await adminService.updateBookingStatus(id, action, reason);
      return ApiResponse.success(res, updated, `Booking marked as ${action}`);
    } catch (err) {
      next(err);
    }
  }

  async createWalkInBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await bookingsService.createBooking(req.body);
      return ApiResponse.created(res, booking, 'Walk-in booking created successfully.');
    } catch (err) {
      next(err);
    }
  }

  async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const search = req.query.search as string | undefined;
      const result = await adminService.getCustomers(page, limit, search);
      return ApiResponse.success(res, result.customers, 'Customers retrieved', 200, result.meta);
    } catch (err) {
      next(err);
    }
  }

  async togglePhoneBlock(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, block, reason } = req.body;
      const result = await adminService.togglePhoneBlock(phone, block, reason);
      return ApiResponse.success(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  async getSlotBlocks(req: Request, res: Response, next: NextFunction) {
    try {
      const courtId = req.query.courtId as string | undefined;
      const blocks = await adminService.getSlotBlocks(courtId);
      return ApiResponse.success(res, blocks);
    } catch (err) {
      next(err);
    }
  }

  async createSlotBlock(req: Request, res: Response, next: NextFunction) {
    try {
      const { courtId, startTime, endTime, reason } = req.body;
      const block = await adminService.createSlotBlock(
        courtId,
        new Date(startTime),
        new Date(endTime),
        reason
      );
      return ApiResponse.created(res, block, 'Slot block created successfully');
    } catch (err) {
      next(err);
    }
  }

  async deleteSlotBlock(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await adminService.deleteSlotBlock(id);
      return ApiResponse.success(res, null, 'Slot block removed successfully');
    } catch (err) {
      next(err);
    }
  }

  async getPricingRules(_req: Request, res: Response, next: NextFunction) {
    try {
      const rules = await prisma.pricingRule.findMany({
        include: { court: true },
        orderBy: { createdAt: 'desc' },
      });
      return ApiResponse.success(res, rules);
    } catch (err) {
      next(err);
    }
  }

  async createPricingRule(req: Request, res: Response, next: NextFunction) {
    try {
      const rule = await prisma.pricingRule.create({
        data: req.body,
      });
      return ApiResponse.created(res, rule, 'Pricing rule created successfully');
    } catch (err) {
      next(err);
    }
  }

  async deletePricingRule(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await prisma.pricingRule.delete({ where: { id } });
      return ApiResponse.success(res, null, 'Pricing rule deleted');
    } catch (err) {
      next(err);
    }
  }

  async getOperatingHours(req: Request, res: Response, next: NextFunction) {
    try {
      const { courtId } = req.params;
      const hours = await prisma.operatingHours.findMany({
        where: { courtId },
        orderBy: { dayOfWeek: 'asc' },
      });
      return ApiResponse.success(res, hours);
    } catch (err) {
      next(err);
    }
  }

  async updateOperatingHours(req: Request, res: Response, next: NextFunction) {
    try {
      const { courtId } = req.params;
      const { schedule } = req.body; // Array of { dayOfWeek, openTime, closeTime, isClosed }

      await prisma.$transaction(async (tx) => {
        for (const item of schedule) {
          await tx.operatingHours.upsert({
            where: {
              courtId_dayOfWeek: {
                courtId,
                dayOfWeek: item.dayOfWeek,
              },
            },
            update: {
              openTime: item.openTime,
              closeTime: item.closeTime,
              isClosed: item.isClosed,
            },
            create: {
              courtId,
              dayOfWeek: item.dayOfWeek,
              openTime: item.openTime,
              closeTime: item.closeTime,
              isClosed: item.isClosed,
            },
          });
        }
      });

      return ApiResponse.success(res, null, 'Operating hours updated successfully');
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();

