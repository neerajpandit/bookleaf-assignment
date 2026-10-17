/**
 * Shared test environment defaults.
 * Primary env setup lives in jest.setup.js.
 */
export const testEnvDefaults = {
  NODE_ENV: 'test',
  PORT: '5001',
  CLIENT_URL: 'http://localhost:3000',
  JWT_SECRET: 'test-jwt-secret-minimum-32-characters-long',
};
