import httpStatus from '../constants/httpStatus.js';

const notFoundHandler = (req, res) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export default notFoundHandler;
