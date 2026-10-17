import path from 'path';
import { fileURLToPath } from 'url';
import SwaggerParser from '@apidevtools/swagger-parser';
import swaggerUi from 'swagger-ui-express';
import helmet from 'helmet';
import { loadConfig } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const OPENAPI_SPEC_PATH = path.resolve(__dirname, '../../docs/api/openapi.yaml');

let cachedOpenApiSpec = null;

export const getOpenApiSpec = async () => {
  if (cachedOpenApiSpec) {
    return cachedOpenApiSpec;
  }

  const spec = await SwaggerParser.dereference(OPENAPI_SPEC_PATH);
  const config = loadConfig();

  spec.servers = [
    {
      url: `http://localhost:${config.port}`,
      description: `Configured local server (PORT=${config.port})`,
    },
    {
      url: '/',
      description: 'Relative to the current host',
    },
  ];

  cachedOpenApiSpec = spec;
  return cachedOpenApiSpec;
};

export const resetOpenApiSpecCache = () => {
  cachedOpenApiSpec = null;
};

export const validateOpenApiSpec = async () => SwaggerParser.validate(OPENAPI_SPEC_PATH);

const swaggerAssetMiddleware = [
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
  swaggerUi.serve,
];

export const setupSwagger = (app) => {
  const { nodeEnv } = loadConfig();

  if (nodeEnv === 'production') {
    return;
  }

  app.get('/api-docs/openapi.json', async (req, res, next) => {
    try {
      const spec = await getOpenApiSpec();
      res.json(spec);
    } catch (error) {
      next(error);
    }
  });

  app.use('/api-docs', ...swaggerAssetMiddleware, async (req, res, next) => {
    try {
      const spec = await getOpenApiSpec();
      const setupMiddleware = swaggerUi.setup(spec, {
        customSiteTitle: 'BookLeaf API Documentation',
        swaggerOptions: {
          persistAuthorization: true,
        },
      });

      return setupMiddleware(req, res, next);
    } catch (error) {
      return next(error);
    }
  });
};
