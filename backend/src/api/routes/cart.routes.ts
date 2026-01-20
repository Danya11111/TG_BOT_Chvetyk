import { Router } from 'express';
import { cartController } from '../controllers/cart.controller';
import { asyncHandler } from '../middlewares/async-handler';
import { validateRequest } from '../middlewares/validate-request';
import { emptyBodySchema, emptyQuerySchema, productIdParamSchema } from '../validation/common.schema';

const router = Router();

router.get('/', validateRequest(emptyQuerySchema, 'query'), asyncHandler(cartController.getCart.bind(cartController)));
router.post(
  '/',
  validateRequest(emptyBodySchema, 'body'),
  asyncHandler(cartController.addItem.bind(cartController))
);
router.delete(
  '/:productId',
  validateRequest(productIdParamSchema, 'params'),
  asyncHandler(cartController.removeItem.bind(cartController))
);

export default router;
