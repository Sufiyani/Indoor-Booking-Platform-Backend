import rateLimit from 'express-rate-limit';
import { ApiResponse } from '../utils/apiResponse';

export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return ApiResponse.tooManyRequests(res, 'Too many requests from this IP. Please try again after 15 minutes.');
  },
});

export const bookingCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 booking attempts per 15 minutes to prevent spam
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return ApiResponse.tooManyRequests(
      res,
      'Too many booking requests from this network. Please wait a few minutes before trying again.'
    );
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15, // 15 login attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return ApiResponse.tooManyRequests(res, 'Too many login attempts. Please try again later.');
  },
});

