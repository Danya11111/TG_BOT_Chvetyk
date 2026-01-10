import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';

const router = Router();

// GET /api/bonus/balance - Получить баланс бонусов
router.get('/balance', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    // TODO: Реализация после интеграции с Posiflora
    res.json({
      success: true,
      data: {
        balance: 0,
        message: 'Bonus balance will be available after Posiflora integration',
      },
    });
  } catch (error) {
    logger.error('Error fetching bonus balance:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch bonus balance' },
    });
  }
});

// POST /api/bonus/calculate - Рассчитать начисляемые бонусы
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    // TODO: Реализация после интеграции с Posiflora
    res.json({
      success: true,
      data: {
        bonusesToAccrue: 0,
        message: 'Bonus calculation will be available after Posiflora integration',
      },
    });
  } catch (error) {
    logger.error('Error calculating bonuses:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to calculate bonuses' },
    });
  }
});

export default router;
