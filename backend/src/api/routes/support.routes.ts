import { Router } from 'express';
import { asyncHandler } from '../middlewares/async-handler';
import { supportController } from '../controllers/support.controller';

const router = Router();

// Trigger support flow from Mini App via backend (works for inline-button mini apps where sendData is unavailable)
router.post('/request', asyncHandler(supportController.request.bind(supportController)));

export default router;

