import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { setupTestDb, teardownTestDb } from '../setup/testDb.js';
import { clearDatabase } from '../helpers/modelTestHelper.js';
import {
  createTestAuthor,
  createTestAdmin,
  loginDirect,
  fetchCsrf,
  withCsrf,
  samplePassword,
} from '../helpers/authHelper.js';
import { createTestBook } from '../helpers/bookHelper.js';
import { createTestTicket } from '../helpers/ticketHelper.js';
import { resetConfigCache } from '../../src/config/index.js';

describe('Security controls', () => {
  let app;

  beforeAll(async () => {
    await setupTestDb();
    const { default: createApp } = await import('../../src/app.js');
    app = createApp();
  }, 60000);

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('CSRF on authenticated mutations', () => {
    it('rejects authenticated ticket mutations without a CSRF token', async () => {
      const author = await createTestAuthor({
        email: 'csrf.author@bookleaf.test',
        authorId: 'SEC001',
      });
      await createTestBook(author._id, { bookId: 'BK901' });

      const agent = request.agent(app);
      const { csrfToken } = await fetchCsrf(agent);
      await withCsrf(agent.post('/api/v1/auth/login'), csrfToken).send({
        email: 'csrf.author@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.post('/api/v1/tickets').send({
        subject: 'Missing CSRF header',
        description: 'Should be rejected.',
        bookId: 'BK901',
      });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Invalid or missing CSRF token');
    });

    it('allows authenticated ticket mutations when CSRF is present', async () => {
      const author = await createTestAuthor({
        email: 'csrf.ok@bookleaf.test',
        authorId: 'SEC002',
      });
      await createTestBook(author._id, { bookId: 'BK902' });

      const { agent } = await loginDirect(app, {
        email: 'csrf.ok@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.post('/api/v1/tickets').send({
        subject: 'Valid CSRF',
        description: 'Should succeed.',
        bookId: 'BK902',
      });

      expect(response.status).toBe(201);
    });
  });

  describe('Author authorization boundaries', () => {
    it('blocks authors from admin ticket queues', async () => {
      await createTestAdmin({ email: 'sec.admin@bookleaf.test' });
      await createTestAuthor({ email: 'sec.author@bookleaf.test', authorId: 'SEC003' });

      const { agent } = await loginDirect(app, {
        email: 'sec.author@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get('/api/v1/admin/tickets');
      expect(response.status).toBe(403);
    });

    it('blocks authors from changing ticket classification', async () => {
      await createTestAdmin({ email: 'sec.admin2@bookleaf.test' });
      const author = await createTestAuthor({
        email: 'sec.author2@bookleaf.test',
        authorId: 'SEC004',
      });
      const ticket = await createTestTicket(author._id, { ticketNumber: 'TKT-SEC1' });

      const { agent } = await loginDirect(app, {
        email: 'sec.author2@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.patch(`/api/v1/admin/tickets/${ticket._id.toString()}/classification`).send({
        priority: 'CRITICAL',
      });

      expect(response.status).toBe(403);
    });

    it('blocks authors from creating private admin notes', async () => {
      await createTestAdmin({ email: 'sec.admin3@bookleaf.test' });
      const author = await createTestAuthor({
        email: 'sec.author3@bookleaf.test',
        authorId: 'SEC005',
      });
      const ticket = await createTestTicket(author._id, { ticketNumber: 'TKT-SEC2' });

      const { agent } = await loginDirect(app, {
        email: 'sec.author3@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.post(`/api/v1/admin/tickets/${ticket._id.toString()}/notes`).send({
        body: 'Attempted private note',
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Non-production diagnostic routes', () => {
    it('returns 404 for the admin-only test route in production', async () => {
      const previousNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      resetConfigCache();
      jest.resetModules();

      const { default: createApp } = await import('../../src/app.js');
      const productionApp = createApp();

      await createTestAdmin({ email: 'prod.admin@bookleaf.test' });
      const { agent } = await loginDirect(productionApp, {
        email: 'prod.admin@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get('/api/v1/auth/test/admin-only');
      expect(response.status).toBe(404);

      process.env.NODE_ENV = previousNodeEnv;
      resetConfigCache();
      jest.resetModules();
    });

    it('does not expose Swagger UI in production', async () => {
      const previousNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      resetConfigCache();
      jest.resetModules();

      const { default: createApp } = await import('../../src/app.js');
      const productionApp = createApp();

      const response = await request(productionApp).get('/api-docs/openapi.json');
      expect(response.status).toBe(404);

      process.env.NODE_ENV = previousNodeEnv;
      resetConfigCache();
      jest.resetModules();
    });
  });
});
