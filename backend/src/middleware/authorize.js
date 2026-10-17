import ApiError from '../utils/ApiError.js';
import httpStatus from '../constants/httpStatus.js';

const authorizeRoles =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.auth?.role) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required'));
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return next(new ApiError(httpStatus.FORBIDDEN, 'Insufficient permissions'));
    }

    return next();
  };

export default authorizeRoles;
