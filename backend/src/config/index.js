import dotenv from 'dotenv';
import Joi from 'joi';
import path from 'path';
import { fileURLToPath } from 'url';
import ms from 'ms';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(5000),
  MONGODB_URI: Joi.string().required().messages({
    'any.required': 'MONGODB_URI is required. Set it in your .env file.',
    'string.empty': 'MONGODB_URI cannot be empty.',
  }),
  CLIENT_URL: Joi.string().uri().required().messages({
    'any.required': 'CLIENT_URL is required for CORS configuration.',
    'string.uri': 'CLIENT_URL must be a valid URI (e.g. http://localhost:3000).',
  }),
  JWT_SECRET: Joi.string().min(32).required().messages({
    'any.required': 'JWT_SECRET is required for authentication configuration.',
    'string.min': 'JWT_SECRET must be at least 32 characters long.',
  }),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  JWT_ISSUER: Joi.string().default('bookleaf-api'),
  JWT_AUDIENCE: Joi.string().default('bookleaf-portal'),
  COOKIE_SAME_SITE: Joi.string().valid('strict', 'lax', 'none').default('lax'),
  AUTH_COOKIE_PATH: Joi.string().default('/'),
}).unknown(true);

let cachedConfig = null;

export const loadConfig = () => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const { error, value } = envSchema.validate(process.env, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map((detail) => detail.message).join('; ');
    throw new Error(`Environment configuration error: ${details}`);
  }

  const jwtExpiresMs = ms(value.JWT_EXPIRES_IN);

  if (typeof jwtExpiresMs !== 'number') {
    throw new Error(`Environment configuration error: JWT_EXPIRES_IN is not a valid duration`);
  }

  cachedConfig = {
    nodeEnv: value.NODE_ENV,
    port: value.PORT,
    mongodbUri: value.MONGODB_URI,
    clientUrl: value.CLIENT_URL,
    jwtSecret: value.JWT_SECRET,
    jwtExpiresIn: value.JWT_EXPIRES_IN,
    jwtExpiresMs,
    jwtIssuer: value.JWT_ISSUER,
    jwtAudience: value.JWT_AUDIENCE,
    cookieSameSite: value.COOKIE_SAME_SITE,
    authCookiePath: value.AUTH_COOKIE_PATH,
  };

  return cachedConfig;
};

export const resetConfigCache = () => {
  cachedConfig = null;
};
