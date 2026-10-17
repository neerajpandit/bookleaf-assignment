import crypto from 'crypto';
import ApiError from '../utils/ApiError.js';
import httpStatus from '../constants/httpStatus.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../constants/auth.js';
import { getCsrfCookieOptions } from '../modules/auth/auth.cookies.js';

export const issueCsrfToken = (req, res) => {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());
  return csrfToken;
};

export const validateCsrf = (req, res, next) => {
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new ApiError(httpStatus.FORBIDDEN, 'Invalid or missing CSRF token'));
  }

  return next();
};

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Validates CSRF on state-changing requests when a session or CSRF cookie is present.
 * Unauthenticated requests with no cookies skip CSRF so auth middleware can return 401.
 */
export const validateCsrfForMutations = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  if (req.path.endsWith('/csrf-token')) {
    return next();
  }

  const hasSessionCookie = Boolean(req.cookies?.[AUTH_COOKIE_NAME]);
  const hasCsrfCookie = Boolean(req.cookies?.[CSRF_COOKIE_NAME]);

  if (!hasSessionCookie && !hasCsrfCookie) {
    return next();
  }

  return validateCsrf(req, res, next);
};
