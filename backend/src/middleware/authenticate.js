import ApiError from '../utils/ApiError.js';
import httpStatus from '../constants/httpStatus.js';
import { verifyAccessToken } from '../utils/jwt.js';
import User from '../modules/users/user.model.js';
import { AUTH_COOKIE_NAME } from '../constants/auth.js';
import { toPublicUser } from '../modules/auth/auth.service.js';

const authenticate = async (req, res, next) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required'));
  }

  let decoded;

  try {
    decoded = verifyAccessToken(token);
  } catch {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired authentication token'));
  }

  const user = await User.findById(decoded.sub);

  if (!user || !user.isActive) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired authentication token'));
  }

  if (decoded.tokenVersion !== user.tokenVersion) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired authentication token'));
  }

  req.user = toPublicUser(user);
  req.auth = {
    userId: user._id,
    role: user.role,
    tokenVersion: user.tokenVersion,
  };

  return next();
};

export default authenticate;
