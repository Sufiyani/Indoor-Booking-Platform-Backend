import { Router } from 'express';
import { slotsController } from '../../controllers/slots.controller';
import { validateRequest } from '../../middlewares/validate';
import { getCourtSlotsQuerySchema } from '../../validators/slot.validator';

const router = Router();

router.get(
  '/:courtId',
  validateRequest({
    params: undefined,
    query: getCourtSlotsQuerySchema.pick({ date: true }),
  }),
  slotsController.getCourtSlots
);

export default router;

