import { BookingStatus } from '@prisma/client';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import { prisma } from '../config/prisma';
import { formatDateInPkt, formatTimeInPkt } from '../utils/timezone';

export class ReportsService {
  /**
   * Generates periodic revenue and booking count trends
   */
  async getRevenueReport(days = 14) {
    const today = new Date();
    const startDate = startOfDay(subDays(today, days - 1));

    const bookings = await prisma.booking.findMany({
      where: {
        date: { gte: startDate },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
      },
      select: {
        date: true,
        totalAmount: true,
        status: true,
        sport: true,
        courtId: true,
      },
    });

    // Group by date
    const dailyMap = new Map<
      string,
      { date: string; confirmedRevenue: number; completedRevenue: number; totalBookings: number }
    >();

    for (let i = 0; i < days; i++) {
      const d = subDays(today, days - 1 - i);
      const key = format(d, 'yyyy-MM-dd');
      dailyMap.set(key, {
        date: key,
        confirmedRevenue: 0,
        completedRevenue: 0,
        totalBookings: 0,
      });
    }

    for (const b of bookings) {
      const key = format(b.date, 'yyyy-MM-dd');
      const entry = dailyMap.get(key);
      if (entry) {
        entry.totalBookings += 1;
        const amount = Number(b.totalAmount);
        if (b.status === BookingStatus.CONFIRMED) {
          entry.confirmedRevenue += amount;
        } else if (b.status === BookingStatus.COMPLETED) {
          entry.completedRevenue += amount;
        }
      }
    }

    // Sport breakdown
    const sportBreakdown: Record<string, { count: number; revenue: number }> = {
      CRICKET: { count: 0, revenue: 0 },
      FOOTBALL: { count: 0, revenue: 0 },
      PADEL: { count: 0, revenue: 0 },
    };

    for (const b of bookings) {
      if (sportBreakdown[b.sport]) {
        sportBreakdown[b.sport].count += 1;
        sportBreakdown[b.sport].revenue += Number(b.totalAmount);
      }
    }

    return {
      dailyTrends: Array.from(dailyMap.values()),
      sportBreakdown,
      totalRevenue: bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0),
      totalBookings: bookings.length,
    };
  }

  /**
   * Generates CSV string for booking export
   */
  async exportBookingsCsv(): Promise<string> {
    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      include: { court: true },
    });

    const headers = [
      'Booking Code',
      'Court Name',
      'Sport',
      'Customer Name',
      'Phone Number',
      'Email',
      'Match Date (PKT)',
      'Time Slot',
      'Duration (Mins)',
      'Total Amount (PKR)',
      'Booking Status',
      'Payment Status',
      'Payment Method',
      'Booked At',
    ];

    const rows = bookings.map((b) => [
      b.bookingCode,
      `"${b.court.name.replace(/"/g, '""')}"`,
      b.sport,
      `"${b.customerName.replace(/"/g, '""')}"`,
      `"${b.customerPhone}"`,
      `"${b.customerEmail || ''}"`,
      formatDateInPkt(b.date),
      `"${formatTimeInPkt(b.startTime)} - ${formatTimeInPkt(b.endTime)}"`,
      b.totalDurationMinutes,
      Number(b.totalAmount),
      b.status,
      b.paymentStatus,
      b.paymentMethod,
      b.createdAt.toISOString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    return csvContent;
  }
}

export const reportsService = new ReportsService();

