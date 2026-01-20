import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { asyncHandler } from '../middlewares/async-handler';
import { validateRequest } from '../middlewares/validate-request';
import { emptyQuerySchema, idParamSchema } from '../validation/common.schema';

const router = Router();

router.get('/', validateRequest(emptyQuerySchema, 'query'), asyncHandler(categoryController.list.bind(categoryController)));
router.get(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  asyncHandler(categoryController.getById.bind(categoryController))
);

export default router;
