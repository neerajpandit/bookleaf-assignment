import rateLimit from 'express-rate-limit';
import httpStatus from '../constants/httpStatus.js';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => Number(process.env.LOGIN_RATE_LIMIT_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
  },
  statusCode: httpStatus.TOO_MANY_REQUESTS,
});
