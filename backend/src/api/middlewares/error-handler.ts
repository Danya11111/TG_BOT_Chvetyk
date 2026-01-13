import { NextFunction, Request, Response } from 'express';
import { config } from '../../config';
import { handleError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const normalizedError = handleError(err);

  logger.error('API Error', {
    message: normalizedError.message,
    statusCode: normalizedError.statusCode,
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  res.status(normalizedError.statusCode).json({
    success: false,
    error: {
      message: normalizedError.message,
      ...(config.nodeEnv === 'development' && { stack: err.stack }),
    },
  });
}
