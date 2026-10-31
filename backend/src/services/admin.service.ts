import { BookingStatus, PaymentStatus, SportType, Prisma } from '@prisma/client';
import { startOfDay, endOfDay, addDays, isBefore } from 'date-fns';
import { prisma } from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';
import { fromKarachiToUtc, formatDateInPkt, formatTimeInPkt } from '../utils/timezone';
import { bookingsService } from './bookings.service';

export interface BookingFilters {
  date?: string; // YYYY-MM-DD
  courtId?: string;
  sport?: SportType;
  status?: BookingStatus;
  search?: string; // phone or booking code
  page?: number;
  limit?: number;
}

export class AdminService {
  /**
   * Retrieves summary statistics for the admin dashboard
   */
  async getDashboardStats() {
    const today = new Date();
    const todayStartUtc = startOfDay(today);
    const todayEndUtc = endOfDay(today);

    // Today's Bookings
    const todayBookings = await prisma.booking.findMany({
      where: {
        date: { gte: todayStartUtc, lte: todayEndUtc },
      },
      include: { court: true },
      orderBy: { startTime: 'asc' },
    });

    const todayCount = todayBookings.length;

    // Upcoming Bookings count
    const upcomingCount = await prisma.booking.count({
      where: {
        startTime: { gte: today },
        status: BookingStatus.CONFIRMED,
      },
    });

    // Revenue stats for today
    let expectedRevenue = 0;
    let collectedRevenue = 0;

    for (const b of todayBookings) {
      const amount = Number(b.totalAmount);
      if (b.status === BookingStatus.CONFIRMED) {
        expectedRevenue += amount;
      } else if (b.status === BookingStatus.COMPLETED) {
        collectedRevenue += amount;
      }
    }

    // Occupancy calculation for today
    const totalCourts = await prisma.court.count({ where: { isActive: true } });
    const bookedSlotsToday = await prisma.bookingSlot.count({
      where: {
        startTime: { gte: todayStartUtc, lte: todayEndUtc },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
      },
    });

    // Assume average 15 slots per active court
    const totalPossibleSlotsToday = Math.max(1, totalCourts * 15);
    const occupancyRate = Math.min(100, Math.round((bookedSlotsToday / totalPossibleSlotsToday) * 100));

    // Recent 5 bookings
    const recentBookings = await prisma.booking.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { court: true },
    });

    return {
      todayCount,
      upcomingCount,
      expectedRevenue,
      collectedRevenue,
      totalRevenueToday: expectedRevenue + collectedRevenue,
      totalCourts,
      bookedSlotsToday,
      occupancyRate,
      recentBookings: recentBookings.map((b) => ({
        id: b.id,
        bookingCode: b.bookingCode,
        courtName: b.court.name,
        sport: b.sport,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        date: formatDateInPkt(b.date),
        time: `${formatTimeInPkt(b.startTime)} - ${formatTimeInPkt(b.endTime)}`,
        totalAmount: Number(b.totalAmount),
        status: b.status,
        paymentStatus: b.paymentStatus,
      })),
    };
  }

  /**
   * Filtered & paginated bookings query
   */
  async getBookings(filters: BookingFilters) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(50, Math.max(1, filters.limit || 15));
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {};

    if (filters.date) {
      const dStart = fromKarachiToUtc(`${filters.date} 00:00:00`);
      const dEnd = fromKarachiToUtc(`${filters.date} 23:59:59`);
      where.date = { gte: dStart, lte: dEnd };
    }

    if (filters.courtId) {
      where.courtId = filters.courtId;
    }

    if (filters.sport) {
      where.sport = filters.sport;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      const term = filters.search.trim();
      where.OR = [
        { bookingCode: { contains: term, mode: 'insensitive' } },
        { customerPhone: { contains: term } },
        { customerName: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'desc' },
        include: {
          court: true,
          bookingSlots: { orderBy: { startTime: 'asc' } },
        },
      }),
    ]);

    const formatted = bookings.map((b) => ({
      id: b.id,
      bookingCode: b.bookingCode,
      courtId: b.courtId,
      courtName: b.court.name,
      sport: b.sport,
      customerName: b.customerName,
      customerPhone: b.customerPhone,
      customerEmail: b.customerEmail,
      date: formatDateInPkt(b.date),
      rawDate: b.date,
      timeSlot: `${formatTimeInPkt(b.startTime)} - ${formatTimeInPkt(b.endTime)}`,
      startTime: b.startTime,
      endTime: b.endTime,
      durationMinutes: b.totalDurationMinutes,
      totalAmount: Number(b.totalAmount),
      status: b.status,
      paymentStatus: b.paymentStatus,
      paymentMethod: b.paymentMethod,
      cancelledReason: b.cancelledReason,   // shows "Cancelled by customer" or "Cancelled by admin"
      cancelledAt: b.cancelledAt,
      notes: b.notes,
      createdAt: b.createdAt,
    }));

    return {
      bookings: formatted,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Updates booking status: Cancel, Mark Completed, or Mark No-Show
   */
  async updateBookingStatus(
    bookingId: string,
    action: 'CANCEL' | 'MARK_COMPLETED' | 'MARK_NO_SHOW',
    reason?: string
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true },
    });

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    const noShowThreshold = settings?.noShowBlockThreshold ?? 3;

    if (action === 'CANCEL') {
      return prisma.$transaction(async (tx) => {
        await tx.bookingSlot.updateMany({
          where: { bookingId: booking.id },
          data: { status: BookingStatus.CANCELLED },
        });

        return tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelledReason: reason || 'Cancelled by admin',
          },
        });
      });
    }

    if (action === 'MARK_COMPLETED') {
      return prisma.$transaction(async (tx) => {
        await tx.bookingSlot.updateMany({
          where: { bookingId: booking.id },
          data: { status: BookingStatus.COMPLETED },
        });

        return tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.COMPLETED,
            paymentStatus: PaymentStatus.PAID,
          },
        });
      });
    }

    if (action === 'MARK_NO_SHOW') {
      return prisma.$transaction(async (tx) => {
        // Update slots and booking to NO_SHOW
        await tx.bookingSlot.updateMany({
          where: { bookingId: booking.id },
          data: { status: BookingStatus.NO_SHOW },
        });

        const updatedBooking = await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.NO_SHOW,
            cancelledReason: 'Customer did not show up',
          },
        });

        // Increment customer no-show count
        const updatedCustomer = await tx.customer.update({
          where: { id: booking.customerId },
          data: {
            noShowCount: { increment: 1 },
          },
        });

        // Check auto block threshold
        if (updatedCustomer.noShowCount >= noShowThreshold && !updatedCustomer.isBlocked) {
          const blockReason = `Auto-blocked: Reached ${updatedCustomer.noShowCount} unexcused no-shows.`;
          await tx.customer.update({
            where: { id: updatedCustomer.id },
            data: {
              isBlocked: true,
              blockedReason: blockReason,
              blockedAt: new Date(),
            },
          });

          await tx.blockedPhone.upsert({
            where: { phone: updatedCustomer.phone },
            update: { reason: blockReason },
            create: {
              phone: updatedCustomer.phone,
              reason: blockReason,
              blockedBy: 'SYSTEM_AUTO_BLOCK',
            },
          });
          console.log(`🚨 Auto-blocked phone ${updatedCustomer.phone} due to repeated no-shows.`);
        }

        return updatedBooking;
      });
    }

    throw new AppError('Invalid action', 400);
  }

  /**
   * Block or unblock a phone number
   */
  async togglePhoneBlock(phone: string, block: boolean, reason?: string) {
    if (block) {
      await prisma.blockedPhone.upsert({
        where: { phone },
        update: { reason: reason || 'Manually blocked by admin' },
        create: {
          phone,
          reason: reason || 'Manually blocked by admin',
          blockedBy: 'ADMIN',
        },
      });

      await prisma.customer.updateMany({
        where: { phone },
        data: {
          isBlocked: true,
          blockedReason: reason || 'Manually blocked by admin',
          blockedAt: new Date(),
        },
      });
      return { success: true, message: `Phone ${phone} blocked successfully.` };
    } else {
      await prisma.blockedPhone.deleteMany({
        where: { phone },
      });

      await prisma.customer.updateMany({
        where: { phone },
        data: {
          isBlocked: false,
          blockedReason: null,
          blockedAt: null,
          noShowCount: 0, // Reset no show count on admin forgiveness
        },
      });
      return { success: true, message: `Phone ${phone} unblocked and no-show count reset.` };
    }
  }

  /**
   * Customer list with stats
   */
  async getCustomers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.CustomerWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      customers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Slot blocks management
   */
  async getSlotBlocks(courtId?: string) {
    return prisma.slotBlock.findMany({
      where: courtId ? { courtId } : undefined,
      include: { court: true },
      orderBy: { startTime: 'desc' },
    });
  }

  async createSlotBlock(courtId: string, startTime: Date, endTime: Date, reason: string) {
    return prisma.slotBlock.create({
      data: {
        courtId,
        startTime,
        endTime,
        reason,
      },
    });
  }

  async deleteSlotBlock(id: string) {
    return prisma.slotBlock.delete({ where: { id } });
  }
}

export const adminService = new AdminService();

