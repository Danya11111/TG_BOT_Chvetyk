import { Router } from 'express';
import { pickupController } from '../controllers/pickup.controller';
import { asyncHandler } from '../middlewares/async-handler';
import { validateRequest } from '../middlewares/validate-request';
import { emptyBodySchema, emptyQuerySchema } from '../validation/common.schema';

const router = Router();

router.get('/points', validateRequest(emptyQuerySchema, 'query'), asyncHandler(pickupController.getPoints.bind(pickupController)));
router.post(
  '/calculate',
  validateRequest(emptyBodySchema, 'body'),
  asyncHandler(pickupController.calculate.bind(pickupController))
);

export default router;
