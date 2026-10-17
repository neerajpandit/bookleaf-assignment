import ApiResponse from '../../utils/ApiResponse.js';
import httpStatus from '../../constants/httpStatus.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../../constants/auth.js';
import {
  getAuthCookieOptions,
  getClearAuthCookieOptions,
  getClearCsrfCookieOptions,
} from './auth.cookies.js';
import { issueCsrfToken } from '../../middleware/csrf.js';
import {
  registerAuthor,
  loginUser,
  getCurrentUser,
  logoutUser,
} from './auth.service.js';

export const getCsrfToken = asyncHandler(async (req, res) => {
  const csrfToken = issueCsrfToken(req, res);

  res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, { csrfToken }, 'CSRF token issued'),
  );
});

export const register = asyncHandler(async (req, res) => {
  const user = await registerAuthor(req.body);

  res.status(httpStatus.CREATED).json(
    new ApiResponse(httpStatus.CREATED, { user }, 'Author account created successfully'),
  );
});

export const login = asyncHandler(async (req, res) => {
  const { accessToken, user } = await loginUser(req.body);

  res.cookie(AUTH_COOKIE_NAME, accessToken, getAuthCookieOptions());

  res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, { user }, 'Login successful'),
  );
});

export const me = asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req.auth.userId);

  res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, { user }, 'Current user profile'),
  );
});

export const logout = asyncHandler(async (req, res) => {
  await logoutUser(req.auth.userId);

  res.clearCookie(AUTH_COOKIE_NAME, getClearAuthCookieOptions());
  res.clearCookie(CSRF_COOKIE_NAME, getClearCsrfCookieOptions());

  res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, null, 'Logout successful'),
  );
});

export const adminOnlyTest = asyncHandler(async (req, res) => {
  res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, { role: req.auth.role }, 'Admin access granted'),
  );
});
