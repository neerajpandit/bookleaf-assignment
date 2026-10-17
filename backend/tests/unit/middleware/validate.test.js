import { jest, describe, it, expect } from '@jest/globals';
import Joi from 'joi';
import validate from '../../../src/middleware/validate.js';

describe('validate middleware', () => {
  const schema = Joi.object({
    message: Joi.string().min(3).required(),
  });

  it('passes validated and stripped input to the next middleware', () => {
    const middleware = validate(schema);
    const req = { body: { message: 'hello', extra: 'removed' } };
    const next = jest.fn();

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body).toEqual({ message: 'hello' });
  });

  it('forwards Joi validation errors to error middleware', () => {
    const middleware = validate(schema);
    const req = { body: { message: 'ab' } };
    const next = jest.fn();

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].isJoi).toBe(true);
  });
});
