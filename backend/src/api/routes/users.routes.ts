import { Router } from 'express';
import { usersController } from '../controllers/users.controller';
import { asyncHandler } from '../middlewares/async-handler';

const router = Router();

router.get('/me', asyncHandler(usersController.getMe.bind(usersController)));
router.patch('/me', asyncHandler(usersController.updateMe.bind(usersController)));
router.post('/me/claim-welcome-bonus', asyncHandler(usersController.claimWelcomeBonus.bind(usersController)));

export default router;
