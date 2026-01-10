import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';

const router = Router();

// GET /api/products - Получить список товаров
router.get('/', async (req: Request, res: Response) => {
  try {
    // TODO: Реализация после интеграции с Posiflora
    // Пока возвращаем заглушку
    res.json({
      success: true,
      data: [],
      message: 'Products list will be available after Posiflora integration',
    });
  } catch (error) {
    logger.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch products' },
    });
  }
});

// GET /api/products/:id - Получить один товар
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // TODO: Реализация после интеграции с Posiflora
    res.status(404).json({
      success: false,
      error: { message: 'Product not found' },
    });
  } catch (error) {
    logger.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch product' },
    });
  }
});

export default router;
