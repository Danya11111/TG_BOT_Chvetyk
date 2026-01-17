import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import Joi from 'joi';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { ForbiddenError } from '../utils/errors';
import { requestLogger } from './middlewares/request-logger';
import { errorHandler } from './middlewares/error-handler';
import { notFoundHandler } from './middlewares/not-found-handler';

import productsRoutes from './routes/products.routes';
import categoriesRoutes from './routes/categories.routes';
import cartRoutes from './routes/cart.routes';
import ordersRoutes from './routes/orders.routes';
import bonusRoutes from './routes/bonus.routes';
import usersRoutes from './routes/users.routes';
import pickupRoutes from './routes/pickup.routes';
import { telegramAuthMiddleware } from './middlewares/telegram-auth';
import { readRateLimiter, writeRateLimiter } from './middlewares/rate-limit';

export function createApp(): Express {
  const app = express();

  const corsWhitelist = config.cors.origin;
  const originSchema = Joi.string().uri({ scheme: ['http', 'https'] });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'self'"],
          objectSrc: ["'none'"],
        },
      },
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      frameguard: { action: 'sameorigin' },
      hsts: config.nodeEnv === 'production',
    })
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          return callback(null, true);
        }
        const { error } = originSchema.validate(origin);
        if (error) {
          return callback(new ForbiddenError('Origin rejected'));
        }
        const allowed = corsWhitelist.some((allowedOrigin) =>
          typeof allowedOrigin === 'string'
            ? allowedOrigin === origin
            : allowedOrigin.test(origin)
        );
        if (!allowed) {
          return callback(new ForbiddenError('Origin not allowed'));
        }
        return callback(null, true);
      },
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/products', readRateLimiter, productsRoutes);
  app.use('/api/categories', readRateLimiter, categoriesRoutes);
  app.use('/api/cart', telegramAuthMiddleware, writeRateLimiter, cartRoutes);
  app.use('/api/orders', telegramAuthMiddleware, writeRateLimiter, ordersRoutes);
  app.use('/api/bonus', telegramAuthMiddleware, writeRateLimiter, bonusRoutes);
  app.use('/api/users', telegramAuthMiddleware, writeRateLimiter, usersRoutes);
  app.use('/api/pickup', telegramAuthMiddleware, writeRateLimiter, pickupRoutes);

  // Serve frontend static build if present
  const staticPath = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(staticPath)) {
    app.use(express.static(staticPath));
    app.get('*', (req, res, next) => {
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/bot') ||
        req.path.startsWith('/auth') ||
        req.path.startsWith('/webhook')
      ) {
        return next();
      }
      return res.sendFile(path.join(staticPath, 'index.html'));
    });
  }

  // 404 + errors
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
