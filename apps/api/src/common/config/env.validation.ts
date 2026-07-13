import * as Joi from 'joi';
import { DEFAULT_API_PORT, DEFAULT_APP_HOST, DEFAULT_WEB_PORT } from '@libheros/contracts';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  APP_HOST: Joi.string().hostname().default(DEFAULT_APP_HOST),
  API_PORT: Joi.number().port().default(DEFAULT_API_PORT),
  WEB_PORT: Joi.number().port().default(DEFAULT_WEB_PORT),
  DATABASE_URL: Joi.string().uri().required(),
  FRONTEND_ORIGIN: Joi.string().uri().optional(),
  CORS_ORIGINS: Joi.string().optional(),
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  COOKIE_SECURE: Joi.boolean().truthy('true').falsy('false').default(false),
});
