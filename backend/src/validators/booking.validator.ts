import { z } from 'zod';
import { isValidPakistaniPhone, normalizePakistaniPhone } from '../utils/phone';

export const createBookingSchema = z.object({
  courtId: z.string().min(1, 'Court ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  slotStartTimes: z
    .array(z.string().datetime({ message: 'Each slot start time must be a valid ISO string' }))
    .min(1, 'At least one slot must be selected')
    .max(6, 'Maximum 6 consecutive hours allowed per booking'),
  customerName: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name cannot exceed 80 characters'),
  customerPhone: z
    .string()
    .trim()
    .refine((val) => isValidPakistaniPhone(val), {
      message: 'Invalid Pakistani mobile number. Example: 0300 1234567 or +923001234567',
    })
    .transform((val) => normalizePakistaniPhone(val)),
  customerEmail: z
    .string()
    .trim()
    .email('Invalid email address format')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val && val.length > 0 ? val.toLowerCase() : null)),
  notes: z.string().max(250, 'Notes cannot exceed 250 characters').optional().nullable(),
});

export const lookupBookingSchema = z.object({
  bookingCode: z
    .string()
    .trim()
    .min(3, 'Booking code is required')
    .transform((v) => v.toUpperCase()),
  phone: z
    .string()
    .trim()
    .refine((val) => isValidPakistaniPhone(val), {
      message: 'Invalid Pakistani mobile number format',
    })
    .transform((val) => normalizePakistaniPhone(val)),
});

export const cancelBookingSchema = z.object({
  bookingCode: z
    .string()
    .trim()
    .min(3, 'Booking code is required')
    .transform((v) => v.toUpperCase()),
  phone: z
    .string()
    .trim()
    .refine((val) => isValidPakistaniPhone(val), {
      message: 'Invalid Pakistani mobile number format',
    })
    .transform((val) => normalizePakistaniPhone(val)),
  reason: z.string().max(300).optional().nullable(),
});

export const adminWalkInBookingSchema = createBookingSchema.extend({
  paymentStatus: z.enum(['UNPAID', 'PAID']).default('UNPAID'),
  sendNotification: z.boolean().default(true),
});

