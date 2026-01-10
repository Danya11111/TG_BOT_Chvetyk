import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';

const router = Router();

// GET /api/users/:telegramId - Получить информацию о пользователе
router.get('/:telegramId', async (req: Request, res: Response) => {
  try {
    const { telegramId } = req.params;
    // TODO: Реализация получения пользователя
    res.status(404).json({
      success: false,
      error: { message: 'User not found' },
    });
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch user' },
    });
  }
});

export default router;
