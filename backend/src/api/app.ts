import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from '../config';
import { logger } from '../utils/logger';
import { handleError } from '../utils/errors';

// Импорт маршрутов (будут созданы позже)
import productsRoutes from './routes/products.routes';
import categoriesRoutes from './routes/categories.routes';
import cartRoutes from './routes/cart.routes';
import ordersRoutes from './routes/orders.routes';
import bonusRoutes from './routes/bonus.routes';
import usersRoutes from './routes/users.routes';
import pickupRoutes from './routes/pickup.routes';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors(config.cors));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Логирование запросов
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/products', productsRoutes);
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api/bonus', bonusRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/pickup', pickupRoutes);

  // Обработка ошибок
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    const error = handleError(err);
    logger.error('API Error:', { error, path: req.path, method: req.method });
    res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        ...(config.nodeEnv === 'development' && { stack: err.stack }),
      },
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        message: 'Route not found',
      },
    });
  });

  return app;
}
