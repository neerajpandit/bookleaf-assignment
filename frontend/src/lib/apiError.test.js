import { describe, expect, it } from 'vitest';
import { normalizeApiError } from './apiError.js';

describe('normalizeApiError', () => {
  it('normalizes network failures', () => {
    const error = { response: undefined, code: 'ERR_NETWORK' };
    const normalized = normalizeApiError(error);

    expect(normalized.isNetworkError).toBe(true);
    expect(normalized.isUnauthorized).toBe(false);
    expect(normalized.statusCode).toBeNull();
  });

  it('normalizes unauthorized responses', () => {
    const error = {
      response: {
        status: 401,
        data: { message: 'Invalid or expired authentication token' },
      },
    };

    const normalized = normalizeApiError(error);
    expect(normalized.isUnauthorized).toBe(true);
    expect(normalized.message).toBe('Invalid or expired authentication token');
  });

  it('preserves validation details', () => {
    const error = {
      response: {
        status: 400,
        data: {
          message: 'Validation failed',
          details: [{ field: 'email', message: 'Email is required' }],
        },
      },
    };

    const normalized = normalizeApiError(error);
    expect(normalized.isValidationError).toBe(true);
    expect(normalized.details).toHaveLength(1);
  });

  it('detects rate limiting', () => {
    const error = {
      response: {
        status: 429,
        data: { message: 'Too many requests' },
      },
    };

    const normalized = normalizeApiError(error);
    expect(normalized.isRateLimited).toBe(true);
  });
});
