import { Router } from 'express';
import { ordersController } from '../controllers/orders.controller';
import { asyncHandler } from '../middlewares/async-handler';
import { validateRequest } from '../middlewares/validate-request';
import { emptyQuerySchema, idParamSchema } from '../validation/common.schema';
import { createOrderSchema, uploadReceiptSchema } from '../validation/orders.schema';

const router = Router();

router.post(
  '/',
  validateRequest(createOrderSchema, 'body'),
  asyncHandler(ordersController.create.bind(ordersController))
);
router.get('/', validateRequest(emptyQuerySchema, 'query'), asyncHandler(ordersController.list.bind(ordersController)));
router.get(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  asyncHandler(ordersController.getById.bind(ordersController))
);
router.post(
  '/:id/receipt',
  validateRequest(idParamSchema, 'params'),
  validateRequest(uploadReceiptSchema, 'body'),
  asyncHandler(ordersController.uploadReceipt.bind(ordersController))
);
router.post(
  '/:id/cancel',
  validateRequest(idParamSchema, 'params'),
  asyncHandler(ordersController.cancel.bind(ordersController))
);

export default router;
