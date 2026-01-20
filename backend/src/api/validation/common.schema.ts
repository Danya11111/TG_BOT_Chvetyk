import Joi from 'joi';

export const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const productIdParamSchema = Joi.object({
  productId: Joi.number().integer().positive().required(),
});

export const telegramIdParamSchema = Joi.object({
  telegramId: Joi.string().pattern(/^\d+$/).required(),
});

export const emptyBodySchema = Joi.object({}).max(0);

export const emptyQuerySchema = Joi.object({}).max(0);
