import { Router } from 'express';
import { courtsController } from '../../controllers/courts.controller';
import { requireAdmin } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate';
import { createCourtSchema, updateCourtSchema } from '../../validators/court.validator';

const router = Router();

// Public routes
router.get('/', courtsController.getCourts);
router.get('/amenities', courtsController.getAmenities);
// Support both /slug/:slug (legacy) and /:slug directly
router.get('/slug/:slug', courtsController.getCourtBySlug);
router.get('/:slug', courtsController.getCourtBySlug);

// Admin-protected routes
router.post('/', requireAdmin, validateRequest({ body: createCourtSchema }), courtsController.createCourt);
router.put('/:id', requireAdmin, validateRequest({ body: updateCourtSchema }), courtsController.updateCourt);
router.patch('/:id/toggle-active', requireAdmin, courtsController.toggleActive);

export default router;

