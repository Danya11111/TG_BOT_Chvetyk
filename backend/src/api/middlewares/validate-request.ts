import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { ValidationError } from '../../utils/errors';

type RequestPart = 'body' | 'query' | 'params' | 'headers';

export function validateRequest(schema: Joi.ObjectSchema, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { value, error } = schema.validate(req[part], {
      abortEarly: false,
      stripUnknown: false,
      convert: true,
      allowUnknown: false,
    });

    if (error) {
      throw new ValidationError('Invalid request data', error.details);
    }

    // eslint-disable-next-line no-param-reassign
    (req as any)[part] = value;
    next();
  };
}
