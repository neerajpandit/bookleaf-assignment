import { Router } from 'express';
import { isDbConnected } from '../config/database.js';
import ApiResponse from '../utils/ApiResponse.js';
import httpStatus from '../constants/httpStatus.js';

const router = Router();

router.get('/health', (req, res) => {
  const dbConnected = isDbConnected();
  const data = {
    uptime: process.uptime(),
    database: dbConnected ? 'connected' : 'disconnected',
  };

  if (!dbConnected) {
    return res
      .status(httpStatus.SERVICE_UNAVAILABLE)
      .json(new ApiResponse(httpStatus.SERVICE_UNAVAILABLE, data, 'Service unavailable'));
  }

  return res
    .status(httpStatus.OK)
    .json(new ApiResponse(httpStatus.OK, data, 'Service is healthy'));
});

export default router;
