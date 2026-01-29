import { Router } from 'express';
import Joi from 'joi';
import { bonusController } from '../controllers/bonus.controller';
import { asyncHandler } from '../middlewares/async-handler';
import { validateRequest } from '../middlewares/validate-request';

const router = Router();

const calculateSchema = Joi.object({
  subtotal: Joi.number().min(0).required(),
});

router.get('/balance', asyncHandler(bonusController.getBalance.bind(bonusController)));
router.post(
  '/calculate',
  validateRequest(calculateSchema, 'body'),
  asyncHandler(bonusController.calculate.bind(bonusController))
);

export default router;
