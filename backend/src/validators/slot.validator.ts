import { z } from 'zod';

export const getCourtSlotsQuerySchema = z.object({
  courtId: z.string().min(1, 'Court ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
});

export const calculatePriceSchema = z.object({
  courtId: z.string().min(1, 'Court ID is required'),
  slotStartTimes: z.array(z.string().datetime()).min(1),
});

