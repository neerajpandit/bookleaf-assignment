import { jest, describe, it, expect } from '@jest/globals';
import asyncHandler from '../../../src/utils/asyncHandler.js';
import ApiError from '../../../src/utils/ApiError.js';

describe('asyncHandler', () => {
  it('forwards asynchronous errors to Express error middleware', async () => {
    const error = new ApiError(400, 'Bad request');
    const handler = asyncHandler(async () => {
      throw error;
    });

    const next = jest.fn();
    await handler({}, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(error);
  });

  it('calls the handler successfully when no error is thrown', async () => {
    const handler = asyncHandler(async (req, res) => {
      res.statusCode = 200;
    });

    const res = {};
    const next = jest.fn();
    await handler({}, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });
});
