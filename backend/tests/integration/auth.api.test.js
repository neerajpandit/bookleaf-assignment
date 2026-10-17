import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { setupTestDb, teardownTestDb } from '../setup/testDb.js';
import { clearDatabase } from '../helpers/modelTestHelper.js';
import {
  createTestInvitation,
  createTestAdmin,
  createTestAuthor,
  fetchCsrf,
  withCsrf,
  loginDirect,
  samplePassword,
} from '../helpers/authHelper.js';
import User from '../../src/modules/users/user.model.js';
import { AUTH_COOKIE_NAME, CSRF_HEADER_NAME } from '../../src/constants/auth.js';
import { loadConfig } from '../../src/config/index.js';

describe('Authentication API', () => {
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

  describe('POST /api/v1/auth/register', () => {
    it('registers an eligible author with a valid invitation token', async () => {
      const { plainToken } = await createTestInvitation();
      const agent = request.agent(app);
      const { csrfToken } = await fetchCsrf(agent);

      const response = await withCsrf(agent.post('/api/v1/auth/register'), csrfToken).send({
        email: 'author.test@bookleaf.test',
        authorId: 'AUTH001',
        invitationToken: plainToken,
        password: samplePassword,
      });

      expect(response.status).toBe(201);
      expect(response.body.data.user).toMatchObject({
        email: 'author.test@bookleaf.test',
        role: 'AUTHOR',
        authorId: 'AUTH001',
        name: 'Test Author',
      });
      expect(response.body.data.user.passwordHash).toBeUndefined();

      const storedUser = await User.findOne({ email: 'author.test@bookleaf.test' }).select(
        '+passwordHash',
      );
      expect(storedUser.passwordHash).not.toBe(samplePassword);
      expect(storedUser.passwordHash).toMatch(/^\$2/);
    });

    it('rejects registration with an invalid invitation token', async () => {
      await createTestInvitation();
      const agent = request.agent(app);
      const { csrfToken } = await fetchCsrf(agent);

      const response = await withCsrf(agent.post('/api/v1/auth/register'), csrfToken).send({
        email: 'author.test@bookleaf.test',
        authorId: 'AUTH001',
        invitationToken: 'invalid-token-value-1234567890',
        password: samplePassword,
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid or expired invitation');
    });

    it('rejects duplicate account registration', async () => {
      const { plainToken } = await createTestInvitation();
      const agent = request.agent(app);
      const { csrfToken } = await fetchCsrf(agent);

      const payload = {
        email: 'author.test@bookleaf.test',
        authorId: 'AUTH001',
        invitationToken: plainToken,
        password: samplePassword,
      };

      await withCsrf(agent.post('/api/v1/auth/register'), csrfToken).send(payload);

      const retry = await withCsrf(agent.post('/api/v1/auth/register'), csrfToken).send(payload);

      expect(retry.status).toBe(409);
    });

    it('always assigns the AUTHOR role and ignores submitted role values', async () => {
      const { plainToken } = await createTestInvitation();
      const agent = request.agent(app);
      const { csrfToken } = await fetchCsrf(agent);

      const response = await withCsrf(agent.post('/api/v1/auth/register'), csrfToken).send({
        email: 'author.test@bookleaf.test',
        authorId: 'AUTH001',
        invitationToken: plainToken,
        password: samplePassword,
        role: 'ADMIN',
      });

      expect(response.status).toBe(201);
      expect(response.body.data.user.role).toBe('AUTHOR');
    });

    it('rejects invalid registration input', async () => {
      const agent = request.agent(app);
      const { csrfToken } = await fetchCsrf(agent);

      const response = await withCsrf(agent.post('/api/v1/auth/register'), csrfToken).send({
        email: 'not-an-email',
        authorId: 'AUTH001',
        invitationToken: 'short',
        password: 'weak',
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('authenticates valid credentials and sets an HttpOnly cookie without returning JWT in body', async () => {
      await createTestAuthor({ email: 'author.login@bookleaf.test', password: samplePassword });

      const { response } = await loginDirect(app, {
        email: 'author.login@bookleaf.test',
        password: samplePassword,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe('author.login@bookleaf.test');
      expect(response.body.data.accessToken).toBeUndefined();
      expect(response.body.data.token).toBeUndefined();

      const setCookie = response.headers['set-cookie'].find((cookie) =>
        cookie.startsWith(`${AUTH_COOKIE_NAME}=`),
      );
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).not.toContain('Secure');
    });

    it('returns a generic message for an invalid password', async () => {
      await createTestAuthor({ email: 'author.login@bookleaf.test', password: samplePassword });

      const { response } = await loginDirect(app, {
        email: 'author.login@bookleaf.test',
        password: 'WrongPass1',
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('returns a generic message for an unknown account', async () => {
      const { response } = await loginDirect(app, {
        email: 'missing.user@bookleaf.test',
        password: samplePassword,
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('rejects inactive accounts with a generic invalid-credentials response', async () => {
      await createTestAuthor({
        email: 'inactive.author@bookleaf.test',
        password: samplePassword,
        isActive: false,
      });

      const { response } = await loginDirect(app, {
        email: 'inactive.author@bookleaf.test',
        password: samplePassword,
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid email or password');
    });

  });

  describe('authentication middleware', () => {
    it('rejects unauthenticated access to /me', async () => {
      const response = await request(app).get('/api/v1/auth/me');
      expect(response.status).toBe(401);
    });

    it('rejects malformed tokens', async () => {
      const agent = request.agent(app);
      const response = await agent
        .get('/api/v1/auth/me')
        .set('Cookie', `${AUTH_COOKIE_NAME}=not-a-valid-jwt`);

      expect(response.status).toBe(401);
    });

    it('rejects expired tokens', async () => {
      const user = await createTestAuthor({
        email: 'expired.token@bookleaf.test',
        password: samplePassword,
      });
      const config = loadConfig();
      const expiredToken = jwt.sign(
        { sub: user._id.toString(), role: user.role, tokenVersion: user.tokenVersion },
        config.jwtSecret,
        { expiresIn: '-1s', issuer: config.jwtIssuer, audience: config.jwtAudience },
      );

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', `${AUTH_COOKIE_NAME}=${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('rejects tokens after logout token-version increment', async () => {
      await createTestAuthor({ email: 'logout.version@bookleaf.test', password: samplePassword });
      const { agent, response: loginResponse } = await loginDirect(app, {
        email: 'logout.version@bookleaf.test',
        password: samplePassword,
      });

      expect(loginResponse.status).toBe(200);

      const { csrfToken } = await fetchCsrf(agent);
      await withCsrf(agent.post('/api/v1/auth/logout'), csrfToken);

      const meResponse = await agent.get('/api/v1/auth/me');
      expect(meResponse.status).toBe(401);
    });

    it('allows access with a valid session cookie', async () => {
      await createTestAuthor({ email: 'valid.session@bookleaf.test', password: samplePassword });
      const { agent } = await loginDirect(app, {
        email: 'valid.session@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get('/api/v1/auth/me');
      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe('valid.session@bookleaf.test');
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });
  });

  describe('role authorization', () => {
    it('forbids authors from the admin-only test route', async () => {
      await createTestAuthor({ email: 'author.role@bookleaf.test', password: samplePassword });
      const { agent } = await loginDirect(app, {
        email: 'author.role@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get('/api/v1/auth/test/admin-only');
      expect(response.status).toBe(403);
    });

    it('allows admins on the admin-only test route', async () => {
      await createTestAdmin({ email: 'admin.role@bookleaf.test', password: samplePassword });
      const { agent } = await loginDirect(app, {
        email: 'admin.role@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get('/api/v1/auth/test/admin-only');
      expect(response.status).toBe(200);
      expect(response.body.data.role).toBe('ADMIN');
    });

    it('does not trust a role supplied in the request body during login', async () => {
      await createTestAuthor({ email: 'author.role@bookleaf.test', password: samplePassword });
      const { agent } = await loginDirect(app, {
        email: 'author.role@bookleaf.test',
        password: samplePassword,
        role: 'ADMIN',
      });

      const response = await agent.get('/api/v1/auth/test/admin-only');
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('clears the authentication cookie', async () => {
      await createTestAuthor({ email: 'logout.user@bookleaf.test', password: samplePassword });
      const { agent } = await loginDirect(app, {
        email: 'logout.user@bookleaf.test',
        password: samplePassword,
      });

      const { csrfToken } = await fetchCsrf(agent);
      const response = await withCsrf(agent.post('/api/v1/auth/logout'), csrfToken);

      expect(response.status).toBe(200);
      const clearedCookie = response.headers['set-cookie']?.find((cookie) =>
        cookie.startsWith(`${AUTH_COOKIE_NAME}=`),
      );
      expect(clearedCookie).toContain('Expires=');
    });
  });

  describe('login rate limiting', () => {
    it('returns 429 after repeated failed login attempts', async () => {
      const previousLimit = process.env.LOGIN_RATE_LIMIT_MAX;
      process.env.LOGIN_RATE_LIMIT_MAX = '2';

      await createTestAuthor({ email: 'rate.limit@bookleaf.test', password: samplePassword });

      let lastStatus = 200;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const agent = request.agent(app);
        const { csrfToken } = await fetchCsrf(agent);
        const response = await withCsrf(agent.post('/api/v1/auth/login'), csrfToken).send({
          email: 'rate.limit@bookleaf.test',
          password: 'WrongPass1',
        });
        lastStatus = response.status;
      }

      expect(lastStatus).toBe(429);
      process.env.LOGIN_RATE_LIMIT_MAX = previousLimit;
    });
  });

  describe('CSRF protection', () => {
    it('rejects state-changing auth requests without a CSRF token', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'missing.csrf@bookleaf.test',
        password: samplePassword,
      });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Invalid or missing CSRF token');
    });
  });
});
