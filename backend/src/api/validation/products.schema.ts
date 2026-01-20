import Joi from 'joi';

export const productListQuerySchema = Joi.object({
  categoryId: Joi.number().integer().positive().optional(),
  categorySlug: Joi.string().trim().max(200).optional(),
  search: Joi.string().trim().max(200).optional(),
  inStock: Joi.boolean().optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  page: Joi.number().integer().positive().default(1),
  limit: Joi.number().integer().positive().max(100).default(20),
  sort: Joi.string()
    .valid('price_asc', 'price_desc', 'newest', 'oldest')
    .optional()
    .default('newest'),
});
