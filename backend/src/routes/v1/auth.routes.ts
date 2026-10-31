import { Router } from 'express';
import { authController } from '../../controllers/auth.controller';
import { requireAdmin } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate';
import { adminLoginSchema } from '../../validators/auth.validator';
import { authLimiter } from '../../middlewares/rateLimiter';

const router = Router();

router.post('/login', authLimiter, validateRequest({ body: adminLoginSchema }), authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAdmin, authController.me);

export default router;

