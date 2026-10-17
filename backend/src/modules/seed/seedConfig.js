import Joi from 'joi';
import { DEMO_ADMIN_PASSWORD, DEMO_AUTHOR_PASSWORD } from './constants.js';

const PRODUCTION_DB_NAME_PATTERN = /^(prod(uction)?)$/i;

const extractDatabaseName = (uri) => {
  if (!uri) {
    return null;
  }

  const withoutQuery = uri.split('?')[0];
  const segments = withoutQuery.split('/').filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const databaseName = segments[segments.length - 1];

  if (databaseName.includes('@') || databaseName.includes(':')) {
    return null;
  }

  return databaseName;
};

const seedEnvSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  MONGODB_URI: Joi.string().required(),
  SEED_CONFIRM: Joi.string().valid('yes').required().messages({
    'any.required': 'SEED_CONFIRM=yes is required to run the seed script.',
    'any.only': 'SEED_CONFIRM must be set to "yes" to run the seed script.',
  }),
  SEED_AUTHOR_DEFAULT_PASSWORD: Joi.string().min(8).required().messages({
    'any.required': 'SEED_AUTHOR_DEFAULT_PASSWORD is required for provisioning new author accounts.',
  }),
  ADMIN_EMAIL: Joi.string().email({ tlds: { allow: false } }).required().messages({
    'any.required': 'ADMIN_EMAIL is required to provision the administrator account.',
  }),
  ADMIN_PASSWORD: Joi.string().min(1).required().messages({
    'any.required': 'ADMIN_PASSWORD is required to provision the administrator account.',
  }),
  ALLOW_PRODUCTION_SEED: Joi.string().valid('true', 'false').default('false'),
}).unknown(true);

export const validateSeedEnvironment = (env = process.env, options = {}) => {
  const { skipConfirm = false, skipProductionGuard = false } = options;

  const schema = skipConfirm
    ? seedEnvSchema.fork(['SEED_CONFIRM'], (field) => field.optional())
    : seedEnvSchema;

  const { error, value } = schema.validate(env, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    const details = error.details.map((detail) => detail.message).join('; ');
    throw new Error(`Seed configuration error: ${details}`);
  }

  const adminEmail = value.ADMIN_EMAIL.trim().toLowerCase();
  const authorPassword = value.SEED_AUTHOR_DEFAULT_PASSWORD;
  const adminPassword = value.ADMIN_PASSWORD;
  const nodeEnv = value.NODE_ENV;
  const databaseName = extractDatabaseName(value.MONGODB_URI);
  const allowProductionSeed = value.ALLOW_PRODUCTION_SEED === 'true';

  if (!skipProductionGuard) {
    if (nodeEnv === 'production') {
      if (authorPassword === DEMO_AUTHOR_PASSWORD) {
        throw new Error(
          'Seed configuration error: SEED_AUTHOR_DEFAULT_PASSWORD cannot use the local demo value in production.',
        );
      }

      if (adminPassword === DEMO_ADMIN_PASSWORD) {
        throw new Error(
          'Seed configuration error: ADMIN_PASSWORD cannot use the local demo value in production.',
        );
      }

      if (!allowProductionSeed) {
        throw new Error(
          'Seed configuration error: production seeding requires ALLOW_PRODUCTION_SEED=true and explicitly supplied strong credentials.',
        );
      }
    }

    if (databaseName && PRODUCTION_DB_NAME_PATTERN.test(databaseName) && !allowProductionSeed) {
      throw new Error(
        `Seed configuration error: refusing to seed a production-like database name "${databaseName}" without ALLOW_PRODUCTION_SEED=true.`,
      );
    }
  }

  return {
    nodeEnv,
    mongodbUri: value.MONGODB_URI,
    authorDefaultPassword: authorPassword,
    adminEmail,
    adminPassword,
    databaseName,
    allowProductionSeed,
  };
};

export default validateSeedEnvironment;
