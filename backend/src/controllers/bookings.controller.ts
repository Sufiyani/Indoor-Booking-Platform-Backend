import { Request, Response, NextFunction } from 'express';
import { bookingsService } from '../services/bookings.service';
import { ApiResponse } from '../utils/apiResponse';

export class BookingsController {
  async createBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { booking, pdfBuffer } = await bookingsService.createBooking(req.body);
      // Return JSON with booking data + base64 PDF so frontend can show success modal and offer download
      return res.status(201).json({
        success: true,
        message: 'Booking confirmed successfully',
        data: {
          bookingCode: booking.bookingCode,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          customerEmail: booking.customerEmail,
          sport: booking.sport,
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
          totalDurationMinutes: booking.totalDurationMinutes,
          totalAmount: booking.totalAmount,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          court: booking.court,
          pdfBase64: pdfBuffer.toString('base64'),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async lookupBooking(req: Request, res: Response, next: NextFunction) {
    try {
      // Support both /lookup?bookingCode=X&phone=Y and /:code?phone=Y
      const bookingCode = (req.params.code || req.query.bookingCode) as string;
      const phone = req.query.phone as string;
      const booking = await bookingsService.lookupBooking(bookingCode?.toUpperCase(), phone);
      return ApiResponse.success(res, booking);
    } catch (err) {
      next(err);
    }
  }

  async cancelBooking(req: Request, res: Response, next: NextFunction) {
    try {
      // Support both body params and URL param for code
      const bookingCode = req.params.code || req.body.bookingCode;
      const { phone, reason } = req.body;
      const cancelled = await bookingsService.cancelBooking(bookingCode?.toUpperCase(), phone, reason);
      return ApiResponse.success(res, cancelled, 'Booking has been successfully cancelled.');
    } catch (err) {
      next(err);
    }
  }

  async downloadPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.params;
      const pdfBuffer = await bookingsService.getBookingPdfBuffer(code.toUpperCase());

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="IndoorArena-Booking-${code.toUpperCase()}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  }
}

export const bookingsController = new BookingsController();

