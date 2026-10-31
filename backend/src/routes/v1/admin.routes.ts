import { Router } from 'express';
import { adminController } from '../../controllers/admin.controller';
import { requireAdmin } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate';
import { adminWalkInBookingSchema } from '../../validators/booking.validator';

const router = Router();

// Protect all admin endpoints
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Bookings management
router.get('/bookings', adminController.getBookings);
router.patch('/bookings/:id/status', adminController.updateBookingStatus);
router.post('/bookings/walk-in', validateRequest({ body: adminWalkInBookingSchema }), adminController.createWalkInBooking);

// Customers & phone block management
router.get('/customers', adminController.getCustomers);
router.post('/customers/toggle-block', adminController.togglePhoneBlock);

// Slot Blocks
router.get('/blocks', adminController.getSlotBlocks);
router.post('/blocks', adminController.createSlotBlock);
router.delete('/blocks/:id', adminController.deleteSlotBlock);

// Pricing Rules
router.get('/pricing-rules', adminController.getPricingRules);
router.post('/pricing-rules', adminController.createPricingRule);
router.delete('/pricing-rules/:id', adminController.deletePricingRule);

// Operating Hours
router.get('/courts/:courtId/operating-hours', adminController.getOperatingHours);
router.put('/courts/:courtId/operating-hours', adminController.updateOperatingHours);

export default router;

