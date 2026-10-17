import { describe, expect, it } from 'vitest';
import { validateLoginForm } from './loginValidation.js';

describe('validateLoginForm', () => {
  it('requires email and password', () => {
    const result = validateLoginForm({ email: '', password: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBeDefined();
    expect(result.errors.password).toBeDefined();
  });

  it('accepts valid credentials shape', () => {
    const result = validateLoginForm({
      email: 'author@bookleaf.test',
      password: 'SecurePass1',
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });
});
