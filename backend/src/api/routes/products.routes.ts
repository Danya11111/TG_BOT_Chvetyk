import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { asyncHandler } from '../middlewares/async-handler';
import { validateRequest } from '../middlewares/validate-request';
import { productListQuerySchema } from '../validation/products.schema';
import { idParamSchema } from '../validation/common.schema';

const router = Router();

router.get(
  '/',
  validateRequest(productListQuerySchema, 'query'),
  asyncHandler(productController.list.bind(productController))
);
router.get(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  asyncHandler(productController.getById.bind(productController))
);

export default router;
