import { z } from 'zod';

export const createCourtSchema = z.object({
  name: z.string().trim().min(3, 'Court name is required'),
  sport: z.enum(['CRICKET', 'FOOTBALL', 'PADEL']),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  basePricePerHour: z.number().positive('Price must be greater than 0'),
  slotDurationMinutes: z.number().int().default(60),
  bufferMinutes: z.number().int().default(0),
  capacity: z.number().int().positive().default(10),
  courtType: z.string().default('Indoor Turf'),
  isActive: z.boolean().default(true),
  amenityIds: z.array(z.string()).optional(),
  images: z
    .array(
      z.object({
        url: z.string().url('Must be a valid image URL'),
        caption: z.string().optional().nullable(),
        isPrimary: z.boolean().default(false),
      })
    )
    .optional(),
});

export const updateCourtSchema = createCourtSchema.partial();

