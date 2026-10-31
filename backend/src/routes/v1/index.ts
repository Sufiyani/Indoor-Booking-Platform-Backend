import { Router } from 'express';
import authRoutes from './auth.routes';
import courtsRoutes from './courts.routes';
import slotsRoutes from './slots.routes';
import bookingsRoutes from './bookings.routes';
import adminRoutes from './admin.routes';
import reportsRoutes from './reports.routes';
import settingsRoutes from './settings.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/courts', courtsRoutes);
router.use('/slots', slotsRoutes);
router.use('/bookings', bookingsRoutes);
router.use('/admin', adminRoutes);
router.use('/reports', reportsRoutes);
router.use('/settings', settingsRoutes);

export default router;

