import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import {
  getOpenApiSpec,
  validateOpenApiSpec,
  OPENAPI_SPEC_PATH,
} from '../../src/config/swagger.js';
import { setupTestDb, teardownTestDb } from '../setup/testDb.js';

describe('OpenAPI documentation foundation', () => {
  let app;

  beforeAll(async () => {
    await setupTestDb();
    const { default: createApp } = await import('../../src/app.js');
    app = createApp();
  }, 60000);

  afterAll(async () => {
    await teardownTestDb();
  });

  it('loads and validates the OpenAPI specification', async () => {
    const spec = await validateOpenApiSpec();

    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.info.title).toBe('BookLeaf Author Support API');
  });

  it('documents the health endpoint that exists in the application', async () => {
    const spec = await getOpenApiSpec();

    expect(spec.paths['/api/v1/health']).toBeDefined();
    expect(spec.paths['/api/v1/health'].get.operationId).toBe('getHealth');
    expect(spec.paths['/api/v1/health'].get.responses['200']).toBeDefined();
    expect(spec.paths['/api/v1/health'].get.responses['503']).toBeDefined();
  });

  it('defines cookie-based authentication for protected endpoints', async () => {
    const spec = await getOpenApiSpec();

    expect(spec.components.securitySchemes.CookieAuth).toMatchObject({
      type: 'apiKey',
      in: 'cookie',
      name: 'bookleaf_access_token',
    });
    expect(spec.paths['/api/v1/auth/login']).toBeDefined();
    expect(spec.paths['/api/v1/auth/me']).toBeDefined();
  });

  it('serves the dereferenced OpenAPI JSON document', async () => {
    const response = await request(app).get('/api-docs/openapi.json');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body.paths['/api/v1/health']).toBeDefined();
    expect(response.body.info.title).toBe('BookLeaf Author Support API');
  });

  it('serves Swagger UI at /api-docs', async () => {
    const response = await request(app).get('/api-docs/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('swagger');
  });

  it('matches documented health success and failure response shapes', async () => {
    const connectedResponse = await request(app).get('/api/v1/health');

    expect(connectedResponse.status).toBe(200);
    expect(connectedResponse.body).toMatchObject({
      success: true,
      statusCode: 200,
      message: 'Service is healthy',
      data: {
        database: 'connected',
      },
    });
    expect(typeof connectedResponse.body.data.uptime).toBe('number');

    const mongoose = (await import('mongoose')).default;
    await mongoose.disconnect();

    const disconnectedResponse = await request(app).get('/api/v1/health');

    expect(disconnectedResponse.status).toBe(503);
    expect(disconnectedResponse.body).toMatchObject({
      success: false,
      statusCode: 503,
      message: 'Service unavailable',
      data: {
        database: 'disconnected',
      },
    });

    const { connectDB } = await import('../../src/config/database.js');
    await connectDB(process.env.MONGODB_URI);
  });

  it('exposes the configured OpenAPI source path constant', () => {
    expect(OPENAPI_SPEC_PATH).toContain('docs/api/openapi.yaml');
  });
});
