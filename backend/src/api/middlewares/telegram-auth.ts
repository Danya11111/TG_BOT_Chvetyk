import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { config } from '../../config';
import { UnauthorizedError } from '../../utils/errors';
import {
  isTelegramDataFresh,
  parseTelegramWebAppData,
  validateTelegramWebAppData,
} from '../../utils/telegram-validator';

const headerSchema = Joi.object({
  'x-telegram-init-data': Joi.string().trim().min(10).max(4000).required(),
}).unknown(true);

const payloadSchema = Joi.object({
  user: Joi.object({
    id: Joi.number().integer().positive().required(),
    is_bot: Joi.boolean().optional(),
    first_name: Joi.string().trim().max(100).required(),
    last_name: Joi.string().trim().max(100).optional(),
    username: Joi.string().trim().max(100).optional(),
    language_code: Joi.string().max(8).optional(),
    allows_write_to_pm: Joi.boolean().optional(),
    photo_url: Joi.string().uri().optional(),
  }).required(),
  auth_date: Joi.number().integer().required(),
  hash: Joi.string().hex().length(64).required(),
  chat_instance: Joi.string().trim().min(1).optional(),
  query_id: Joi.string().trim().optional(),
});

const AUTH_TTL_SECONDS = 5 * 60;

export async function telegramAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const { error, value } = headerSchema.validate(req.headers, { stripUnknown: true, allowUnknown: true });
    if (error) {
      return next(new UnauthorizedError('Missing init data'));
    }

    const initData = value['x-telegram-init-data'] as string;

    const isValid = validateTelegramWebAppData(initData, config.telegram.botToken);
    if (!isValid) {
      return next(new UnauthorizedError('Invalid init data signature'));
    }

    const parsed = parseTelegramWebAppData(initData);
    const { error: payloadError, value: validatedPayload } = payloadSchema.validate(parsed, {
      stripUnknown: true,
    });
    if (payloadError) {
      return next(new UnauthorizedError('Invalid init data payload'));
    }

    if (!isTelegramDataFresh(validatedPayload.auth_date, AUTH_TTL_SECONDS)) {
      return next(new UnauthorizedError('Init data expired'));
    }

    if (Object.prototype.hasOwnProperty.call(req, 'user')) {
      return next(new UnauthorizedError('User already set'));
    }

    Object.defineProperty(req, 'user', {
      value: Object.freeze(validatedPayload.user),
      writable: false,
      configurable: false,
    });
    return next();
  } catch (error) {
    return next(error as Error);
  }
}
