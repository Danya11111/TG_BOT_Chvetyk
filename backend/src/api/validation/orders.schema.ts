import Joi from 'joi';
import { DELIVERY_TYPES, PAYMENT_TYPES } from '../../utils/constants';

const orderItemSchema = Joi.object({
  productId: Joi.number().integer().positive().required(),
  productName: Joi.string().trim().max(255).required(),
  price: Joi.number().positive().required(),
  quantity: Joi.number().integer().positive().required(),
  image: Joi.string().uri().allow('', null).optional(),
});

const deliveryAddressSchema = Joi.object({
  city: Joi.string().trim().max(255).required(),
  street: Joi.string().trim().max(255).required(),
  house: Joi.string().trim().max(50).required(),
  apartment: Joi.string().trim().max(50).allow('', null).optional(),
  postalCode: Joi.string().trim().max(50).allow('', null).optional(),
});

const deliverySchema = Joi.object({
  type: Joi.string()
    .valid(DELIVERY_TYPES.DELIVERY, DELIVERY_TYPES.PICKUP)
    .required(),
  address: deliveryAddressSchema.when('type', {
    is: DELIVERY_TYPES.DELIVERY,
    then: deliveryAddressSchema.required(),
    otherwise: Joi.any().strip(),
  }),
  pickupPointId: Joi.number().integer().positive().allow(null).optional(),
  date: Joi.string().trim().required(),
  time: Joi.string().trim().required(),
});

export const createOrderSchema = Joi.object({
  customer: Joi.object({
    name: Joi.string().trim().max(255).required(),
    phone: Joi.string().trim().max(50).required(),
    email: Joi.string().trim().max(255).allow('', null).optional(),
  }).required(),
  delivery: deliverySchema.required(),
  recipient: Joi.object({
    name: Joi.string().trim().max(255).required(),
    phone: Joi.string().trim().max(50).required(),
  }).required(),
  cardText: Joi.string().trim().allow('').required(),
  comment: Joi.string().trim().allow('').optional(),
  paymentType: Joi.string()
    .valid(PAYMENT_TYPES.CARD_REQUISITES, PAYMENT_TYPES.SBP_QR)
    .required(),
  items: Joi.array().min(1).items(orderItemSchema).required(),
});

export const uploadReceiptSchema = Joi.object({
  imageDataUrl: Joi.string().trim().required(),
  fileName: Joi.string().trim().max(255).allow('', null).optional(),
});
