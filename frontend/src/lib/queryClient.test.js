import { describe, expect, it } from 'vitest';
import { createQueryClient } from './queryClient.js';

describe('createQueryClient', () => {
  it('does not retry unauthorized query errors', () => {
    const client = createQueryClient();
    const retry = client.getDefaultOptions().queries.retry;

    const unauthorizedError = { normalized: { isUnauthorized: true } };
    expect(retry(1, unauthorizedError)).toBe(false);
  });

  it('limits network error retries', () => {
    const client = createQueryClient();
    const retry = client.getDefaultOptions().queries.retry;

    const networkError = { normalized: { isNetworkError: true } };
    expect(retry(0, networkError)).toBe(true);
    expect(retry(1, networkError)).toBe(false);
  });

  it('disables mutation retries', () => {
    const client = createQueryClient();
    expect(client.getDefaultOptions().mutations.retry).toBe(false);
  });
});
