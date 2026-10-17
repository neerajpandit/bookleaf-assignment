import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { setupTestDb, teardownTestDb } from '../setup/testDb.js';

describe('Foundation API integration', () => {
  let app;

  beforeAll(async () => {
    await setupTestDb();
    const { default: createApp } = await import('../../src/app.js');
    app = createApp();
  }, 60000);

  afterAll(async () => {
    await teardownTestDb();
  });

  it('returns success from health endpoint when database is connected', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Service is healthy',
      data: {
        database: 'connected',
      },
    });
    expect(typeof response.body.data.uptime).toBe('number');
  });

  it('returns non-success status from health endpoint when database is disconnected', async () => {
    await mongoose.disconnect();

    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Service unavailable',
      data: {
        database: 'disconnected',
      },
    });

    const { connectDB } = await import('../../src/config/database.js');
    await connectDB(process.env.MONGODB_URI);
  });

  it('returns consistent JSON 404 for unknown routes', async () => {
    const response = await request(app).get('/api/v1/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Route not found: GET /api/v1/unknown-route',
    });
  });

  it('returns validation error response for invalid Joi input', async () => {
    const response = await request(app)
      .post('/api/v1/demo/validate')
      .send({ message: 'ab' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'message',
        }),
      ]),
    );
  });

  it('can import the application without starting an HTTP listener', async () => {
    const { default: createApp } = await import('../../src/app.js');
    const testApp = createApp();

    expect(testApp).toBeDefined();
    expect(typeof testApp.listen).toBe('function');
  });
});
