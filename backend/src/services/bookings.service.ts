import { PrismaClient, BookingStatus, PaymentStatus, PaymentMethod, Prisma } from '@prisma/client';
import { addHours, subHours, isBefore, parseISO } from 'date-fns';
import { prisma } from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';
import { generateBookingCode } from '../utils/bookingCode';
import { formatDateInPkt, formatTimeInPkt, formatInPkt, toKarachiTime } from '../utils/timezone';
import { pdfService } from './pdf.service';
import { slotsService } from './slots.service';

export interface CreateBookingInput {
  courtId: string;
  date: string; // YYYY-MM-DD
  slotStartTimes: string[]; // ISO Strings
  customerName: string;
  customerPhone: string; // Normalized +923...
  customerEmail?: string | null;
  notes?: string | null;
  paymentStatus?: PaymentStatus;
  sendNotification?: boolean;
}

export class BookingsService {
  /**
   * Creates a confirmed booking atomically inside a database transaction,
   * enforcing slot exclusivity, phone abuse checks, and server-side pricing.
   */
  async createBooking(input: CreateBookingInput) {
    const { courtId, date, slotStartTimes, customerName, customerPhone, customerEmail, notes } = input;

    // 1. Fetch Global Settings
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    const maxActive = settings?.maxActiveBookingsPerPhone ?? 2;
    const cancelWindowHours = settings?.cancellationWindowHours ?? 4;

    // 2. Abuse Prevention: Check Blocked Phone
    const isBlocked = await prisma.blockedPhone.findUnique({
      where: { phone: customerPhone },
    });
    if (isBlocked) {
      throw new AppError(
        `This phone number is currently blocked from making bookings. Reason: ${isBlocked.reason}. Please contact venue management.`,
        403
      );
    }

    // Check Active Bookings Limit for this phone
    const activeBookingsCount = await prisma.booking.count({
      where: {
        customerPhone,
        status: BookingStatus.CONFIRMED,
      },
    });

    if (activeBookingsCount >= maxActive) {
      throw new AppError(
        `Booking limit reached: A maximum of ${maxActive} active bookings are allowed per phone number. Please complete or cancel your existing reservation first.`,
        400
      );
    }

    // 3. Sort slot start times chronologically
    const sortedStartTimes = [...slotStartTimes].map((t) => new Date(t)).sort((a, b) => a.getTime() - b.getTime());
    const slotDurationMs = 60 * 60 * 1000; // 60 min

    // Validate that multiple slots are strictly consecutive
    for (let i = 0; i < sortedStartTimes.length - 1; i++) {
      const current = sortedStartTimes[i].getTime();
      const next = sortedStartTimes[i + 1].getTime();
      if (next - current !== slotDurationMs) {
        throw new AppError('Selected slots must be consecutive hours.', 400);
      }
    }

    const overallStartTimeUtc = sortedStartTimes[0];
    const overallEndTimeUtc = new Date(sortedStartTimes[sortedStartTimes.length - 1].getTime() + slotDurationMs);
    const nowUtc = new Date();

    if (isBefore(overallStartTimeUtc, nowUtc)) {
      throw new AppError('Cannot book slots in the past.', 400);
    }

    // Calculate cancellation allowed until
    const cancellationAllowedUntil = subHours(overallStartTimeUtc, cancelWindowHours);

    // 4. Execute atomic transaction
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // Verify Court
          const court = await tx.court.findUnique({
            where: { id: courtId },
            include: {
              pricingRules: { where: { isActive: true } },
            },
          });

          if (!court || !court.isActive) {
            throw new AppError('Selected court is not available.', 404);
          }

          // Fetch Global Pricing Rules
          const globalRules = await tx.pricingRule.findMany({
            where: { courtId: null, isActive: true },
          });
          const allRules = [...court.pricingRules, ...globalRules];

          // Check if any of these slots conflict with existing active booking slots
          const conflictingSlots = await tx.bookingSlot.findMany({
            where: {
              courtId,
              status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
              startTime: { in: sortedStartTimes },
            },
          });

          if (conflictingSlots.length > 0) {
            throw new AppError('One or more selected slots were just booked. Please pick another time.', 409);
          }

          // Check if any slot conflicts with slot blocks
          const conflictingBlocks = await tx.slotBlock.findMany({
            where: {
              courtId,
              startTime: { lt: overallEndTimeUtc },
              endTime: { gt: overallStartTimeUtc },
            },
          });

          if (conflictingBlocks.length > 0) {
            throw new AppError(`Selected time overlaps with a court maintenance or private block: ${conflictingBlocks[0].reason}`, 409);
          }

          // Calculate server-side prices for each slot
          let totalAmount = 0;
          const slotsToCreate: Array<{
            startTime: Date;
            endTime: Date;
            price: number;
          }> = [];

          for (const sStart of sortedStartTimes) {
            const sEnd = new Date(sStart.getTime() + slotDurationMs);
            const localStart = toKarachiTime(sStart);
            const dayOfWeek = localStart.getDay();
            const timeHHmm = `${String(localStart.getHours()).padStart(2, '0')}:${String(localStart.getMinutes()).padStart(2, '0')}`;

            const { finalPrice } = slotsService.calculateSlotPrice(
              Number(court.basePricePerHour),
              dayOfWeek,
              timeHHmm,
              allRules
            );

            totalAmount += finalPrice;
            slotsToCreate.push({
              startTime: sStart,
              endTime: sEnd,
              price: finalPrice,
            });
          }

          // Find or create customer
          let customer = await tx.customer.findUnique({
            where: { phone: customerPhone },
          });

          if (!customer) {
            customer = await tx.customer.create({
              data: {
                name: customerName,
                phone: customerPhone,
                email: customerEmail,
                totalBookings: 1,
              },
            });
          } else {
            customer = await tx.customer.update({
              where: { id: customer.id },
              data: {
                name: customerName,
                email: customerEmail || customer.email,
                totalBookings: { increment: 1 },
              },
            });
          }

          // Generate unique booking code
          let bookingCode = generateBookingCode();
          let exists = await tx.booking.findUnique({ where: { bookingCode } });
          while (exists) {
            bookingCode = generateBookingCode();
            exists = await tx.booking.findUnique({ where: { bookingCode } });
          }

          // Create Booking record
          const booking = await tx.booking.create({
            data: {
              bookingCode,
              courtId: court.id,
              customerId: customer.id,
              customerName,
              customerPhone,
              customerEmail,
              sport: court.sport,
              date: new Date(date),
              startTime: overallStartTimeUtc,
              endTime: overallEndTimeUtc,
              totalDurationMinutes: sortedStartTimes.length * 60,
              totalAmount,
              status: BookingStatus.CONFIRMED,
              paymentStatus: input.paymentStatus ?? PaymentStatus.UNPAID,
              paymentMethod: PaymentMethod.CASH_ON_ARRIVAL,
              cancellationAllowedUntil,
              notes,
              bookingSlots: {
                create: slotsToCreate.map((slot) => ({
                  courtId: court.id,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  price: slot.price,
                  status: BookingStatus.CONFIRMED,
                })),
              },
            },
            include: {
              court: true,
              bookingSlots: true,
            },
          });

          return { booking, customer, court, totalAmount };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      );

      // 5. Post-transaction: Generate PDF confirmation pass
      const pdfBuffer = await this.generateBookingPdf(result.booking, result.court, settings);

      return { booking: result.booking, pdfBuffer };
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError('One or more selected slots were just booked. Please pick another time.', 409);
      }
      throw err;
    }
  }

  /**
   * Helper to generate PDF confirmation buffer for a booking
   */
  async generateBookingPdf(booking: any, court: any, settings: any): Promise<Buffer> {
    const dateStr = formatDateInPkt(booking.date);
    const timeSlotStr = `${formatTimeInPkt(booking.startTime)} - ${formatTimeInPkt(booking.endTime)}`;
    const cancelStr = formatInPkt(booking.cancellationAllowedUntil);

    return pdfService.generateBookingPdf({
      bookingCode: booking.bookingCode,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail,
      courtName: court.name,
      sport: court.sport,
      courtType: court.courtType,
      dateStr,
      timeSlotStr,
      durationMinutes: booking.totalDurationMinutes,
      totalAmount: Number(booking.totalAmount),
      paymentMethod: 'Cash on Arrival',
      paymentStatus: booking.paymentStatus,
      venueName: settings?.venueName ?? 'IndoorArena Sports Complex',
      venueAddress: settings?.address ?? 'Plot 42, Block 5, Clifton, Karachi, Pakistan',
      venuePhone: settings?.phone ?? '+92 300 1234567',
      venueEmail: settings?.email ?? 'contact@indoorarena.pk',
      cancellationAllowedUntilStr: cancelStr,
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    });
  }

  /**
   * Looks up a booking by Booking Code + Phone number
   */
  async lookupBooking(bookingCode: string, phone: string) {
    const booking = await prisma.booking.findFirst({
      where: {
        bookingCode,
        customerPhone: phone,
      },
      include: {
        court: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
        bookingSlots: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!booking) {
      throw new AppError('No matching booking found with provided code and phone number.', 404);
    }

    const now = new Date();
    const canCancel = booking.status === BookingStatus.CONFIRMED && isBefore(now, booking.cancellationAllowedUntil);

    return {
      ...booking,
      canCancel,
      formattedDate: formatDateInPkt(booking.date),
      formattedTime: `${formatTimeInPkt(booking.startTime)} - ${formatTimeInPkt(booking.endTime)}`,
      formattedCancellationDeadline: formatInPkt(booking.cancellationAllowedUntil),
    };
  }

  /**
   * Cancels a booking by Code + Phone if within the cancellation window
   */
  async cancelBooking(bookingCode: string, phone: string, reason?: string | null) {
    const booking = await prisma.booking.findFirst({
      where: {
        bookingCode,
        customerPhone: phone,
      },
      include: {
        court: true,
      },
    });

    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new AppError('This booking is already cancelled.', 400);
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new AppError('Completed bookings cannot be cancelled.', 400);
    }

    const now = new Date();
    if (!isBefore(now, booking.cancellationAllowedUntil)) {
      throw new AppError(
        `Cancellation window expired. Bookings can only be cancelled up to ${formatInPkt(booking.cancellationAllowedUntil)}.`,
        400
      );
    }

    // Cancel atomically: update booking status and free up booking slots
    const updated = await prisma.$transaction(async (tx) => {
      await tx.bookingSlot.updateMany({
        where: { bookingId: booking.id },
        data: { status: BookingStatus.CANCELLED },
      });

      return tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: now,
          cancelledReason: reason || 'Cancelled by customer via manage booking page',
        },
        include: { court: true },
      });
    });

    return updated;
  }

  /**
   * Generates PDF stream/buffer for download by booking code
   */
  async getBookingPdfBuffer(bookingCode: string): Promise<Buffer> {
    const booking = await prisma.booking.findUnique({
      where: { bookingCode },
      include: { court: true },
    });

    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    const dateStr = formatDateInPkt(booking.date);
    const timeSlotStr = `${formatTimeInPkt(booking.startTime)} - ${formatTimeInPkt(booking.endTime)}`;
    const cancelStr = formatInPkt(booking.cancellationAllowedUntil);

    return pdfService.generateBookingPdf({
      bookingCode: booking.bookingCode,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail,
      courtName: booking.court.name,
      sport: booking.court.sport,
      courtType: booking.court.courtType,
      dateStr,
      timeSlotStr,
      durationMinutes: booking.totalDurationMinutes,
      totalAmount: Number(booking.totalAmount),
      paymentMethod: 'Cash on Arrival',
      paymentStatus: booking.paymentStatus,
      venueName: settings?.venueName ?? 'IndoorArena Sports Complex',
      venueAddress: settings?.address ?? 'Plot 42, Block 5, Clifton, Karachi, Pakistan',
      venuePhone: settings?.phone ?? '+92 300 1234567',
      venueEmail: settings?.email ?? 'contact@indoorarena.pk',
      cancellationAllowedUntilStr: cancelStr,
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    });
  }
}

export const bookingsService = new BookingsService();

