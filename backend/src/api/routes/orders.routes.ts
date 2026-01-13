import { Router } from 'express';
import { ordersController } from '../controllers/orders.controller';
import { asyncHandler } from '../middlewares/async-handler';
import { validateRequest } from '../middlewares/validate-request';
import { emptyBodySchema, emptyQuerySchema, idParamSchema } from '../validation/common.schema';

const router = Router();

router.post(
  '/',
  validateRequest(emptyBodySchema, 'body'),
  asyncHandler(ordersController.create.bind(ordersController))
);
router.get('/', validateRequest(emptyQuerySchema, 'query'), asyncHandler(ordersController.list.bind(ordersController)));
router.get(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  asyncHandler(ordersController.getById.bind(ordersController))
);

export default router;
