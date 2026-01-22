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
import configRoutes from './routes/config.routes';
import { telegramAuthMiddleware } from './middlewares/telegram-auth';
import { readRateLimiter, writeRateLimiter } from './middlewares/rate-limit';
import { testConnection } from '../database/connection';
import { testRedisConnection } from '../database/redis';

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

  // Telegram Webhook endpoint (для fallback, если polling не работает)
  // ВАЖНО: Этот endpoint должен быть ДО express.json(), чтобы получить raw body
  app.post('/api/telegram/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const { logger } = await import('../utils/logger');
    
    // Отвечаем сразу, чтобы Telegram знал, что endpoint работает
    // Обработку делаем асинхронно
    res.status(200).send('OK');
    
    try {
      logger.info('📥 Webhook request received', {
        contentType: req.headers['content-type'],
        bodySize: req.body?.length || 0,
        hasBody: !!req.body,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress,
      });
      
      if (!req.body || req.body.length === 0) {
        logger.warn('Empty webhook body received');
        return;
      }
      
      const { getBot } = await import('../bot/bot');
      const bot = getBot();
      
      // Парсим JSON из raw body
      let update;
      try {
        update = JSON.parse(req.body.toString());
      } catch (parseError) {
        logger.error('Failed to parse webhook body:', {
          error: parseError,
          bodyPreview: req.body?.toString().substring(0, 500),
        });
        return;
      }
      
      logger.info('📥 Processing webhook update', {
        updateId: update.update_id,
        hasCallbackQuery: !!update.callback_query,
        callbackData: update.callback_query?.data,
        messageId: update.callback_query?.message?.message_id,
        chatId: update.callback_query?.message?.chat?.id,
        hasMessage: !!update.message,
        messageType: update.message?.text ? 'text' : update.message?.photo ? 'photo' : 'other',
      });
      
      // Обрабатываем update асинхронно (не блокируем ответ)
      bot.handleUpdate(update).catch((handleError) => {
        logger.error('Error handling webhook update:', {
          error: handleError,
          errorMessage: handleError instanceof Error ? handleError.message : String(handleError),
          stack: handleError instanceof Error ? handleError.stack : undefined,
          updateId: update?.update_id,
        });
      });
      
      logger.info('✅ Webhook update queued for processing', { updateId: update.update_id });
    } catch (error) {
      logger.error('❌ Webhook error:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        bodyPreview: req.body?.toString().substring(0, 200),
      });
      // Ответ уже отправлен, просто логируем ошибку
    }
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(requestLogger);

  // HTTPS redirect for production
  if (config.nodeEnv === 'production') {
    app.use((req, res, next) => {
      const forwardedProto = req.header('x-forwarded-proto');
      const host = req.header('host');
      
      if (forwardedProto !== 'https' && host) {
        return res.redirect(301, `https://${host}${req.url}`);
      }
      next();
    });
  }

  // Health check with database and Redis status
  app.get('/health', async (req, res) => {
    const checks: Record<string, boolean | string> = {
      timestamp: new Date().toISOString(),
    };

    try {
      checks.database = await testConnection();
    } catch (error) {
      checks.database = false;
      checks.databaseError = error instanceof Error ? error.message : 'Unknown error';
    }

    try {
      checks.redis = await testRedisConnection();
    } catch (error) {
      checks.redis = false;
      checks.redisError = error instanceof Error ? error.message : 'Unknown error';
    }

    const isHealthy = checks.database === true && checks.redis === true;
    res.status(isHealthy ? 200 : 503).json(checks);
  });

  // API Routes
  app.use('/api/products', readRateLimiter, productsRoutes);
  app.use('/api/categories', readRateLimiter, categoriesRoutes);
  app.use('/api/cart', telegramAuthMiddleware, writeRateLimiter, cartRoutes);
  app.use('/api/orders', telegramAuthMiddleware, writeRateLimiter, ordersRoutes);
  app.use('/api/bonus', telegramAuthMiddleware, writeRateLimiter, bonusRoutes);
  app.use('/api/users', telegramAuthMiddleware, writeRateLimiter, usersRoutes);
  app.use('/api/pickup', telegramAuthMiddleware, writeRateLimiter, pickupRoutes);
  app.use('/api/config', readRateLimiter, configRoutes);

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
