import { Request, Response, NextFunction } from 'express';
import { slotsService } from '../services/slots.service';
import { ApiResponse } from '../utils/apiResponse';

export class SlotsController {
  async getCourtSlots(req: Request, res: Response, next: NextFunction) {
    try {
      const courtId = req.params.courtId || (req.query.courtId as string);
      const date = req.query.date as string;
      const result = await slotsService.getSlotsForCourtDate(courtId, date);
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }
}

export const slotsController = new SlotsController();

