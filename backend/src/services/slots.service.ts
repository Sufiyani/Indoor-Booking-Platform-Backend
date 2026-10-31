import { parse, format, addMinutes, isBefore, isAfter, isSameDay } from 'date-fns';
import { prisma } from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';
import { fromKarachiToUtc, toKarachiTime } from '../utils/timezone';

export interface ComputedSlot {
  startTime: string; // ISO UTC string
  endTime: string;   // ISO UTC string
  localStartTime: string; // e.g. "09:00"
  localEndTime: string;   // e.g. "10:00"
  displayTime: string;    // e.g. "09:00 AM - 10:00 AM"
  price: number;          // In PKR
  basePrice: number;      // Base price PKR
  surcharge: number;      // Peak surcharge amount
  isPeak: boolean;
  status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'PAST';
  blockReason?: string;
}

export class SlotsService {
  /**
   * Computes all hourly slots for a given court on a specific date (YYYY-MM-DD in PKT),
   * accounting for operating hours, past slots, active bookings, blocks, and peak pricing.
   */
  async getSlotsForCourtDate(courtId: string, dateStr: string): Promise<{
    court: { id: string; name: string; sport: string; basePricePerHour: number };
    date: string;
    slots: ComputedSlot[];
  }> {
    // 1. Fetch Court
    const court = await prisma.court.findUnique({
      where: { id: courtId },
      include: {
        pricingRules: { where: { isActive: true } },
      },
    });

    if (!court || !court.isActive) {
      throw new AppError('Court not found or currently inactive', 404);
    }

    // Also fetch global pricing rules (courtId is null)
    const globalPricingRules = await prisma.pricingRule.findMany({
      where: { courtId: null, isActive: true },
    });
    const allPricingRules = [...court.pricingRules, ...globalPricingRules];

    // 2. Parse Date in Karachi Time
    // Target date start e.g. "2026-10-29 00:00" PKT -> UTC
    const dayStartUtc = fromKarachiToUtc(`${dateStr} 00:00:00`);
    const dayEndUtc = fromKarachiToUtc(`${dateStr} 23:59:59`);
    const targetDateLocal = toKarachiTime(dayStartUtc);
    const dayOfWeek = targetDateLocal.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // 3. Operating Hours for this day of week
    const operatingHour = await prisma.operatingHours.findUnique({
      where: {
        courtId_dayOfWeek: {
          courtId,
          dayOfWeek,
        },
      },
    });

    if (!operatingHour || operatingHour.isClosed) {
      return {
        court: {
          id: court.id,
          name: court.name,
          sport: court.sport,
          basePricePerHour: Number(court.basePricePerHour),
        },
        date: dateStr,
        slots: [],
      };
    }

    // 4. Fetch Active Bookings on this date range for this court
    // (CONFIRMED or COMPLETED slots)
    const activeBookingSlots = await prisma.bookingSlot.findMany({
      where: {
        courtId,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        startTime: { gte: dayStartUtc, lte: dayEndUtc },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    // 5. Fetch Slot Blocks on this date range for this court
    const slotBlocks = await prisma.slotBlock.findMany({
      where: {
        courtId,
        startTime: { lte: dayEndUtc },
        endTime: { gte: dayStartUtc },
      },
    });

    // 6. Generate Hourly Slots
    const slotDuration = court.slotDurationMinutes || 60;
    const slots: ComputedSlot[] = [];

    // Parse openTime & closeTime in PKT
    // openTime e.g. "09:00", closeTime e.g. "00:00" or "01:00"
    const openTimeParsed = parse(operatingHour.openTime, 'HH:mm', targetDateLocal);
    let closeTimeParsed = parse(operatingHour.closeTime, 'HH:mm', targetDateLocal);

    // If closeTime is <= openTime (e.g. 00:00 or 01:00 past midnight), it belongs to next day
    if (!isAfter(closeTimeParsed, openTimeParsed)) {
      closeTimeParsed = addMinutes(closeTimeParsed, 24 * 60);
    }

    let currentSlotStartLocal = openTimeParsed;
    const nowUtc = new Date();

    while (isBefore(addMinutes(currentSlotStartLocal, slotDuration), closeTimeParsed) || +addMinutes(currentSlotStartLocal, slotDuration) === +closeTimeParsed) {
      const currentSlotEndLocal = addMinutes(currentSlotStartLocal, slotDuration);

      // Convert slot times to UTC for DB comparison
      const slotStartUtc = fromKarachiToUtc(format(currentSlotStartLocal, 'yyyy-MM-dd HH:mm:ss'));
      const slotEndUtc = fromKarachiToUtc(format(currentSlotEndLocal, 'yyyy-MM-dd HH:mm:ss'));

      const localStartStr = format(currentSlotStartLocal, 'HH:mm');
      const localEndStr = format(currentSlotEndLocal, 'HH:mm');
      const displayStart = format(currentSlotStartLocal, 'hh:mm a');
      const displayEnd = format(currentSlotEndLocal, 'hh:mm a');

      // Check Past
      const isPast = isBefore(slotStartUtc, nowUtc);

      // Check Booked
      const isBooked = activeBookingSlots.some(
        (b) => Math.abs(b.startTime.getTime() - slotStartUtc.getTime()) < 1000
      );

      // Check Blocked
      const matchingBlock = slotBlocks.find(
        (block) =>
          isBefore(slotStartUtc, block.endTime) && isAfter(slotEndUtc, block.startTime)
      );

      let status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'PAST' = 'AVAILABLE';
      let blockReason: string | undefined;

      if (isPast) {
        status = 'PAST';
      } else if (matchingBlock) {
        status = 'BLOCKED';
        blockReason = matchingBlock.reason;
      } else if (isBooked) {
        status = 'BOOKED';
      }

      // Calculate Price
      const basePrice = Number(court.basePricePerHour);
      const { finalPrice, surcharge, isPeak } = this.calculateSlotPrice(
        basePrice,
        dayOfWeek,
        localStartStr,
        allPricingRules
      );

      slots.push({
        startTime: slotStartUtc.toISOString(),
        endTime: slotEndUtc.toISOString(),
        localStartTime: localStartStr,
        localEndTime: localEndStr,
        displayTime: `${displayStart} - ${displayEnd}`,
        price: finalPrice,
        basePrice,
        surcharge,
        isPeak,
        status,
        blockReason,
      });

      currentSlotStartLocal = addMinutes(currentSlotStartLocal, slotDuration);
    }

    return {
      court: {
        id: court.id,
        name: court.name,
        sport: court.sport,
        basePricePerHour: Number(court.basePricePerHour),
      },
      date: dateStr,
      slots,
    };
  }

  /**
   * Evaluates pricing rules for a slot based on court base price, day of week, and time of day.
   */
  calculateSlotPrice(
    basePrice: number,
    dayOfWeek: number,
    timeHHmm: string,
    rules: Array<{
      daysOfWeek: number[];
      startTime: string;
      endTime: string;
      type: string;
      value: any;
      isActive: boolean;
    }>
  ): { finalPrice: number; surcharge: number; isPeak: boolean } {
    let finalPrice = basePrice;
    let surcharge = 0;
    let isPeak = false;

    for (const rule of rules) {
      if (!rule.isActive) continue;

      // Check if day matches
      if (rule.daysOfWeek.length > 0 && !rule.daysOfWeek.includes(dayOfWeek)) {
        continue;
      }

      // Check if time matches (e.g. "18:00" <= "19:00" and "19:00" <= "23:59")
      if (timeHHmm >= rule.startTime && timeHHmm <= rule.endTime) {
        isPeak = true;
        const ruleVal = Number(rule.value);
        if (rule.type === 'PERCENTAGE_SURCHARGE') {
          const ruleSurcharge = Math.round((basePrice * ruleVal) / 100);
          surcharge += ruleSurcharge;
          finalPrice += ruleSurcharge;
        } else if (rule.type === 'FIXED_SURCHARGE') {
          surcharge += ruleVal;
          finalPrice += ruleVal;
        } else if (rule.type === 'FIXED_PRICE') {
          finalPrice = ruleVal;
          surcharge = Math.max(0, ruleVal - basePrice);
        }
      }
    }

    return { finalPrice, surcharge, isPeak };
  }
}

export const slotsService = new SlotsService();

