import { jest, describe, it, expect, afterEach } from '@jest/globals';
import errorHandler from '../../../src/middleware/errorHandler.js';
import ApiError from '../../../src/utils/ApiError.js';

const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.headersSent = false;
  return res;
};

describe('errorHandler middleware', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns expected status and message for ApiError instances', () => {
    const err = new ApiError(404, 'Resource not found', { id: '123' });
    const res = createMockResponse();
    const next = jest.fn();

    errorHandler(err, {}, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Resource not found',
      details: { id: '123' },
    });
  });

  it('returns validation details for Joi errors', () => {
    const err = new JoiValidationErrorStub();
    const res = createMockResponse();

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation failed',
      details: [{ field: 'message', message: '"message" is required' }],
    });
  });

  it('does not leak stack traces or internal details in production mode', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err = new Error('Database connection string mongodb://secret');
    const res = createMockResponse();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal server error',
    });
    expect(res.json.mock.calls[0][0]).not.toHaveProperty('stack');
    expect(consoleSpy).toHaveBeenCalled();

    process.env.NODE_ENV = originalNodeEnv;
    consoleSpy.mockRestore();
  });
});

class JoiValidationErrorStub extends Error {
  constructor() {
    super('Validation failed');
    this.isJoi = true;
    this.details = [{ path: ['message'], message: '"message" is required' }];
  }
}
