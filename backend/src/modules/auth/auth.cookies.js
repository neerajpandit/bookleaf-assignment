import { loadConfig } from '../../config/index.js';
import { AUTH_COOKIE_NAME } from '../../constants/auth.js';

export const getAuthCookieOptions = () => {
  const config = loadConfig();

  return {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.cookieSameSite,
    path: config.authCookiePath,
    maxAge: config.jwtExpiresMs,
  };
};

export const getClearAuthCookieOptions = () => {
  const config = loadConfig();

  return {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.cookieSameSite,
    path: config.authCookiePath,
  };
};

export const getCsrfCookieOptions = () => {
  const config = loadConfig();

  return {
    httpOnly: false,
    secure: config.nodeEnv === 'production',
    sameSite: config.cookieSameSite,
    path: config.authCookiePath,
    maxAge: config.jwtExpiresMs,
  };
};

export const getClearCsrfCookieOptions = () => getClearAuthCookieOptions();

export { AUTH_COOKIE_NAME };
