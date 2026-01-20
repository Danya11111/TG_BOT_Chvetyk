import { Router } from 'express';
import { usersController } from '../controllers/users.controller';
import { asyncHandler } from '../middlewares/async-handler';
import { validateRequest } from '../middlewares/validate-request';
import { telegramIdParamSchema } from '../validation/common.schema';

const router = Router();

router.get(
  '/:telegramId',
  validateRequest(telegramIdParamSchema, 'params'),
  asyncHandler(usersController.getByTelegramId.bind(usersController))
);

export default router;
