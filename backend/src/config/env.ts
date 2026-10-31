import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from apps/api/.env or root .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.string().default('5000').transform((v) => parseInt(v, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  COOKIE_SECRET: z.string().default('indoorarena_cookie_secret_key'),
  TIMEZONE: z.string().default('Asia/Karachi'),
  CURRENCY: z.string().default('PKR'),
  CANCELLATION_WINDOW_HOURS: z.string().optional().default('4').transform((v) => parseInt(v, 10)),
  MAX_ACTIVE_BOOKINGS_PER_PHONE: z.string().optional().default('2').transform((v) => parseInt(v, 10)),
  NO_SHOW_BLOCK_THRESHOLD: z.string().optional().default('3').transform((v) => parseInt(v, 10)),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;

