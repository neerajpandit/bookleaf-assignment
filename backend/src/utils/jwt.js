import jwt from 'jsonwebtoken';
import { loadConfig } from '../config/index.js';

export const signAccessToken = (payload) => {
  const config = loadConfig();

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  });
};

export const verifyAccessToken = (token) => {
  const config = loadConfig();

  return jwt.verify(token, config.jwtSecret, {
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  });
};
