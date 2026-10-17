import ApiError from '../utils/ApiError.js';
import httpStatus from '../constants/httpStatus.js';
import { removeTempFile } from '../modules/attachments/ticketAttachment.service.js';

const formatJoiDetails = (error) =>
  error.details.map((detail) => ({
    field: detail.path.join('.') || 'root',
    message: detail.message,
  }));

const formatMongooseDetails = (error) =>
  Object.entries(error.errors).map(([field, err]) => ({
    field,
    message: err.message,
  }));

const cleanupFailedUpload = async (req) => {
  if (req.file?.path) {
    await removeTempFile(req.file.path);
  }
};

const errorHandler = async (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (req.file?.path && (err.isJoi || err.statusCode === httpStatus.BAD_REQUEST)) {
    try {
      await cleanupFailedUpload(req);
    } catch {
      // Best-effort cleanup for rejected uploads.
    }
  }

  const isProduction = process.env.NODE_ENV === 'production';
  let statusCode = httpStatus.INTERNAL_SERVER_ERROR;
  let message = 'Internal server error';
  let details = null;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err.isJoi) {
    statusCode = httpStatus.BAD_REQUEST;
    message = 'Validation failed';
    details = formatJoiDetails(err);
  } else if (err.name === 'ValidationError' && err.errors) {
    statusCode = httpStatus.BAD_REQUEST;
    message = 'Validation failed';
    details = formatMongooseDetails(err);
  } else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = httpStatus.BAD_REQUEST;
    message = 'Invalid JSON payload';
  }

  if (statusCode === httpStatus.INTERNAL_SERVER_ERROR && !isProduction) {
    console.error(err);
  } else if (statusCode === httpStatus.INTERNAL_SERVER_ERROR && isProduction) {
    console.error('Unexpected error:', err.message);
  }

  const response = {
    success: false,
    message,
  };

  if (details) {
    response.details = details;
  }

  if (err.statusCode === httpStatus.TOO_MANY_REQUESTS || err.status === httpStatus.TOO_MANY_REQUESTS) {
    statusCode = httpStatus.TOO_MANY_REQUESTS;
    message = err.message || 'Too many requests';
  }

  return res.status(statusCode).json(response);
};

export default errorHandler;
