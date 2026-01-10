import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';

const router = Router();

// GET /api/pickup/points - Получить точки самовывоза
router.get('/points', async (req: Request, res: Response) => {
  try {
    // TODO: Реализация после интеграции с Posiflora
    res.json({
      success: true,
      data: [],
      message: 'Pickup points will be available after Posiflora integration',
    });
  } catch (error) {
    logger.error('Error fetching pickup points:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch pickup points' },
    });
  }
});

// POST /api/pickup/calculate - Рассчитать стоимость доставки
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    // TODO: Реализация расчёта доставки
    res.json({
      success: true,
      data: {
        deliveryCost: 0,
        message: 'Delivery calculation will be available after configuration',
      },
    });
  } catch (error) {
    logger.error('Error calculating delivery:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to calculate delivery' },
    });
  }
});

export default router;
