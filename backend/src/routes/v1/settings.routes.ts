import { Router } from 'express';
import { settingsController } from '../../controllers/settings.controller';
import { requireAdmin } from '../../middlewares/auth.middleware';

const router = Router();

// Publicly readable venue settings (name, address, phone, etc.)
router.get('/', settingsController.getSettings);

// Admin can update
router.put('/', requireAdmin, settingsController.updateSettings);

export default router;

