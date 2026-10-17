import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import ApiError from '../utils/ApiError.js';
import httpStatus from '../constants/httpStatus.js';
import {
  TICKET_ATTACHMENT_FIELD_NAME,
  TICKET_ATTACHMENT_MAX_BYTES,
} from '../constants/ticketAttachment.js';
import { ensureUploadDirectories, getTempUploadDir } from '../modules/attachments/ticketAttachment.service.js';

const storage = multer.diskStorage({
  destination: async (req, file, callback) => {
    try {
      await ensureUploadDirectories();
      callback(null, getTempUploadDir());
    } catch (error) {
      callback(error);
    }
  },
  filename: (req, file, callback) => {
    callback(null, `${crypto.randomUUID()}${path.extname(file.originalname || '').toLowerCase()}`);
  },
});

export const ticketAttachmentUpload = multer({
  storage,
  limits: {
    files: 1,
    fileSize: TICKET_ATTACHMENT_MAX_BYTES,
  },
}).single(TICKET_ATTACHMENT_FIELD_NAME);

export const handleTicketAttachmentUpload = (req, res, next) => {
  ticketAttachmentUpload(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(
        new ApiError(
          httpStatus.BAD_REQUEST,
          `Attachment exceeds the maximum allowed size of ${TICKET_ATTACHMENT_MAX_BYTES} bytes`,
        ),
      );
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new ApiError(httpStatus.BAD_REQUEST, 'Only one attachment field is allowed'));
    }

    return next(error);
  });
};

export default handleTicketAttachmentUpload;
