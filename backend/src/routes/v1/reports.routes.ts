import { Router } from 'express';
import { reportsController } from '../../controllers/reports.controller';
import { requireAdmin } from '../../middlewares/auth.middleware';

const router = Router();

router.use(requireAdmin);

router.get('/revenue', reportsController.getRevenueReport);
router.get('/export/bookings.csv', reportsController.exportBookingsCsv);

export default router;

