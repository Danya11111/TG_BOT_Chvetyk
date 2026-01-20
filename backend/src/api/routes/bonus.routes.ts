import { Router } from 'express';
import { bonusController } from '../controllers/bonus.controller';
import { asyncHandler } from '../middlewares/async-handler';
import { validateRequest } from '../middlewares/validate-request';
import { emptyBodySchema, emptyQuerySchema } from '../validation/common.schema';

const router = Router();

router.get('/balance', validateRequest(emptyQuerySchema, 'query'), asyncHandler(bonusController.getBalance.bind(bonusController)));
router.post(
  '/calculate',
  validateRequest(emptyBodySchema, 'body'),
  asyncHandler(bonusController.calculate.bind(bonusController))
);

export default router;
