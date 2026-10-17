import { Router } from 'express';
import Joi from 'joi';
import validate from '../middleware/validate.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import httpStatus from '../constants/httpStatus.js';

const router = Router();

const demoValidationSchema = Joi.object({
  message: Joi.string().min(3).required(),
});

router.post(
  '/validate',
  validate(demoValidationSchema),
  asyncHandler(async (req, res) => {
    res
      .status(httpStatus.OK)
      .json(new ApiResponse(httpStatus.OK, req.body, 'Validation passed'));
  }),
);

export default router;
