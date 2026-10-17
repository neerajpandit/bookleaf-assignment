import path from 'path';
import { fileURLToPath } from 'url';
import { DEMO_ADMIN_PASSWORD, DEMO_AUTHOR_PASSWORD } from '../../src/modules/seed/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const sampleDatasetPath = path.resolve(__dirname, '../fixtures/seed-sample.json');
export const duplicateBooksDatasetPath = path.resolve(__dirname, '../fixtures/seed-duplicate-books.json');
export const fullDatasetPath = path.resolve(
  __dirname,
  '../../docs/FULLSTACK-SAMPLEDATA (1) (1).json',
);

export const buildSeedEnv = (overrides = {}) => ({
  NODE_ENV: 'test',
  MONGODB_URI: process.env.MONGODB_URI,
  SEED_CONFIRM: 'yes',
  SEED_AUTHOR_DEFAULT_PASSWORD: DEMO_AUTHOR_PASSWORD,
  ADMIN_EMAIL: 'admin@bookleaf.test',
  ADMIN_PASSWORD: DEMO_ADMIN_PASSWORD,
  ALLOW_PRODUCTION_SEED: 'false',
  ...overrides,
});

export const buildSeedConfig = (overrides = {}) => {
  const env = buildSeedEnv(overrides.env);
  delete overrides.env;

  return {
    nodeEnv: env.NODE_ENV,
    mongodbUri: env.MONGODB_URI,
    authorDefaultPassword: env.SEED_AUTHOR_DEFAULT_PASSWORD,
    adminEmail: env.ADMIN_EMAIL.trim().toLowerCase(),
    adminPassword: env.ADMIN_PASSWORD,
    databaseName: 'bookleaf-test',
    allowProductionSeed: env.ALLOW_PRODUCTION_SEED === 'true',
    ...overrides,
  };
};
