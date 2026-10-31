import { Router } from 'express';
import { bookingsController } from '../../controllers/bookings.controller';
import { validateRequest } from '../../middlewares/validate';
import { createBookingSchema, lookupBookingSchema, cancelBookingSchema } from '../../validators/booking.validator';
import { bookingCreationLimiter } from '../../middlewares/rateLimiter';

const router = Router();

// Create new guest booking (returns JSON with booking data + base64 PDF)
router.post(
  '/',
  bookingCreationLimiter,
  validateRequest({ body: createBookingSchema }),
  bookingsController.createBooking
);

// Lookup booking by code + phone — GET /lookup?bookingCode=IA-XXXX&phone=+92...
router.get(
  '/lookup',
  validateRequest({ query: lookupBookingSchema }),
  bookingsController.lookupBooking
);

// Download PDF — must be BEFORE /:code to avoid greedy match
router.get(
  '/:code/pdf',
  bookingsController.downloadPdf
);

// Cancel booking — POST /cancel (body: bookingCode, phone)
router.post(
  '/cancel',
  validateRequest({ body: cancelBookingSchema }),
  bookingsController.cancelBooking
);

// Cancel by code in URL — must be BEFORE /:code
router.post(
  '/:code/cancel',
  bookingsController.cancelBooking
);

// Lookup by code in URL — GET /:code?phone=+92... (keep LAST among GET routes)
router.get(
  '/:code',
  bookingsController.lookupBooking
);

export default router;

