import { describe, it, expect } from '@jest/globals';
import { isTransientAiError, createProviderHttpError } from '../../../src/modules/ai/aiErrors.js';

describe('aiErrors', () => {
  it('detects transient HTTP status codes', () => {
    expect(isTransientAiError(createProviderHttpError('OpenAI', 429))).toBe(true);
    expect(isTransientAiError(createProviderHttpError('OpenAI', 503))).toBe(true);
    expect(isTransientAiError(createProviderHttpError('OpenAI', 400))).toBe(false);
  });

  it('detects transient timeout and rate-limit messages', () => {
    expect(isTransientAiError(new Error('OpenAI request timed out'))).toBe(true);
    expect(isTransientAiError(new Error('OpenAI rate limit exceeded'))).toBe(true);
    expect(isTransientAiError(new Error('Validation failed'))).toBe(false);
  });
});
