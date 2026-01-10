import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';

const router = Router();

// GET /api/categories - Получить список категорий
router.get('/', async (req: Request, res: Response) => {
  try {
    // TODO: Реализация после интеграции с Posiflora
    res.json({
      success: true,
      data: [],
      message: 'Categories list will be available after Posiflora integration',
    });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch categories' },
    });
  }
});

export default router;
