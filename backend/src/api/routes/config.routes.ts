import { Router } from 'express';
import { configController } from '../controllers/config.controller';
import { asyncHandler } from '../middlewares/async-handler';
import { validateRequest } from '../middlewares/validate-request';
import { emptyQuerySchema } from '../validation/common.schema';

const router = Router();

router.get('/', validateRequest(emptyQuerySchema, 'query'), asyncHandler(configController.getCustomerConfig.bind(configController)));

export default router;
