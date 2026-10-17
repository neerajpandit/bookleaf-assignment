import request from 'supertest';
import { hashToken, hashPassword } from '../../src/utils/password.js';
import AuthorInvitation from '../../src/modules/users/authorInvitation.model.js';
import User from '../../src/modules/users/user.model.js';
import { ROLES } from '../../src/constants/roles.js';
import { CSRF_HEADER_NAME } from '../../src/constants/auth.js';

export const samplePassword = 'SecurePass1';

export const createTestInvitation = async (overrides = {}) => {
  const plainToken = overrides.plainToken || 'test-invitation-token-secure-32chars';

  delete overrides.plainToken;

  const tokenHash = await hashToken(plainToken);

  const invitation = await AuthorInvitation.create({
    email: 'author.test@bookleaf.test',
    authorId: 'AUTH001',
    name: 'Test Author',
    phone: '+91-90000-00001',
    city: 'Mumbai',
    joinedDate: new Date('2023-01-01'),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    ...overrides,
    tokenHash,
  });

  return { invitation, plainToken };
};

export const createTestAdmin = async ({ password = samplePassword, ...overrides } = {}) => {
  const passwordHash = await hashPassword(password);

  return User.create({
    email: 'admin.test@bookleaf.test',
    passwordHash,
    role: ROLES.ADMIN,
    name: 'Test Admin',
    isActive: true,
    ...overrides,
  });
};

export const createTestAuthor = async ({ password = samplePassword, ...overrides } = {}) => {
  const passwordHash = await hashPassword(password);

  return User.create({
    email: 'registered.author@bookleaf.test',
    passwordHash,
    role: ROLES.AUTHOR,
    authorId: 'AUTH002',
    name: 'Registered Author',
    isActive: true,
    ...overrides,
  });
};

export const fetchCsrf = async (agent) => {
  const response = await agent.get('/api/v1/auth/csrf-token');

  return {
    csrfToken: response.body.data.csrfToken,
    response,
  };
};

export const withCsrf = (req, csrfToken) => req.set(CSRF_HEADER_NAME, csrfToken);

export const enableCsrfOnAgent = (agent, csrfToken) => {
  const wrapMethod = (method) => {
    const original = agent[method].bind(agent);
    agent[method] = (url) => withCsrf(original(url), csrfToken);
  };

  wrapMethod('post');
  wrapMethod('patch');
  wrapMethod('put');
  wrapMethod('delete');

  agent.__csrfToken = csrfToken;
  return agent;
};

export const loginDirect = (app, payload) => {
  const agent = request.agent(app);
  return fetchCsrf(agent).then(({ csrfToken }) =>
    withCsrf(agent.post('/api/v1/auth/login'), csrfToken).send(payload).then((response) => {
      enableCsrfOnAgent(agent, csrfToken);
      return {
        agent,
        response,
        csrfToken,
      };
    }),
  );
};
