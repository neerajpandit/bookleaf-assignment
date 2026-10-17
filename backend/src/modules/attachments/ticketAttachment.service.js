import crypto from 'crypto';
import fs from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ApiError from '../../utils/ApiError.js';
import httpStatus from '../../constants/httpStatus.js';
import {
  TICKET_ATTACHMENT_ALLOWED_EXTENSIONS,
  TICKET_ATTACHMENT_ALLOWED_MIME_TYPES,
  TICKET_ATTACHMENT_MAX_BYTES,
  TICKET_ATTACHMENT_STORAGE_PROVIDER,
} from '../../constants/ticketAttachment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_UPLOAD_ROOT = path.resolve(__dirname, '../../../storage/ticket-attachments');
const TEMP_DIR_NAME = 'tmp';

let uploadRootOverride = null;

export const setUploadRootForTests = (rootPath) => {
  uploadRootOverride = rootPath;
};

export const resetUploadRootForTests = () => {
  uploadRootOverride = null;
};

export const getUploadRoot = () => uploadRootOverride || DEFAULT_UPLOAD_ROOT;

export const getTempUploadDir = () => path.join(getUploadRoot(), TEMP_DIR_NAME);

export const ensureUploadDirectories = async () => {
  await fs.mkdir(getTempUploadDir(), { recursive: true });
  await fs.mkdir(getUploadRoot(), { recursive: true });
};

const sanitizeOriginalFilename = (originalName) => {
  const basename = path.basename(originalName || 'attachment').replace(/[^\w.\- ()[\]]+/g, '_');
  return basename.slice(0, 255) || 'attachment';
};

const getExtension = (originalName) => {
  const ext = path.extname(originalName || '').toLowerCase();
  return TICKET_ATTACHMENT_ALLOWED_EXTENSIONS.includes(ext) ? ext : null;
};

const readHeader = async (filePath, length = 16) => {
  const handle = await fs.open(filePath, 'r');

  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
};

const detectAttachmentType = async (filePath, extension) => {
  const header = await readHeader(filePath, 12);

  if (extension === '.pdf') {
    return header.slice(0, 4).toString('ascii') === '%PDF' ? 'application/pdf' : null;
  }

  if (extension === '.png') {
    const isPng =
      header.length >= 4 &&
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47;
    return isPng ? 'image/png' : null;
  }

  if (extension === '.jpg' || extension === '.jpeg') {
    const isJpeg = header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    return isJpeg ? 'image/jpeg' : null;
  }

  if (extension === '.gif') {
    const signature = header.slice(0, 6).toString('ascii');
    return signature === 'GIF87a' || signature === 'GIF89a' ? 'image/gif' : null;
  }

  if (extension === '.txt') {
    const sample = await fs.readFile(filePath);
    if (sample.includes(0)) {
      return null;
    }

    try {
      sample.toString('utf8');
      return 'text/plain';
    } catch {
      return null;
    }
  }

  return null;
};

export const validateUploadedAttachmentFile = async (file) => {
  if (!file) {
    return null;
  }

  if (!file.path || !existsSync(file.path)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Uploaded attachment is missing or unreadable');
  }

  if (file.size <= 0 || file.size > TICKET_ATTACHMENT_MAX_BYTES) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Attachment must be between 1 byte and ${TICKET_ATTACHMENT_MAX_BYTES} bytes`,
    );
  }

  const extension = getExtension(file.originalname);
  if (!extension) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Unsupported attachment type. Allowed types: PDF, PNG, JPG, GIF, TXT',
    );
  }

  const detectedMimeType = await detectAttachmentType(file.path, extension);
  if (!detectedMimeType || !TICKET_ATTACHMENT_ALLOWED_MIME_TYPES.includes(detectedMimeType)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Attachment content does not match an allowed file type');
  }

  return {
    extension,
    detectedMimeType,
    originalFilename: sanitizeOriginalFilename(file.originalname),
    sizeBytes: file.size,
  };
};

export const buildStorageKey = (extension) => `${crypto.randomUUID()}${extension}`;

export const resolveStoredFilePath = (storageKey) => {
  if (!/^[a-f0-9-]+\.(pdf|png|jpe?g|gif|txt)$/i.test(storageKey)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid attachment reference');
  }

  const resolvedPath = path.resolve(getUploadRoot(), storageKey);
  const rootWithSeparator = `${getUploadRoot()}${path.sep}`;

  if (!resolvedPath.startsWith(rootWithSeparator) && resolvedPath !== getUploadRoot()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid attachment reference');
  }

  return resolvedPath;
};

export const persistUploadedAttachment = async (file) => {
  const validated = await validateUploadedAttachmentFile(file);
  if (!validated) {
    return null;
  }

  await ensureUploadDirectories();

  const storageKey = buildStorageKey(validated.extension);
  const destinationPath = resolveStoredFilePath(storageKey);

  try {
    await fs.rename(file.path, destinationPath);
  } catch (error) {
    await removeTempFile(file.path);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Unable to store ticket attachment');
  }

  return {
    originalFilename: validated.originalFilename,
    storageKey,
    mimeType: validated.detectedMimeType,
    sizeBytes: validated.sizeBytes,
    uploadedAt: new Date(),
    storageProvider: TICKET_ATTACHMENT_STORAGE_PROVIDER,
  };
};

export const removeTempFile = async (filePath) => {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

export const deleteStoredAttachment = async (storageKey) => {
  if (!storageKey) {
    return;
  }

  try {
    const filePath = resolveStoredFilePath(storageKey);
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof ApiError)) {
      throw error;
    }
  }
};

export const openStoredAttachmentStream = (storageKey) => {
  const filePath = resolveStoredFilePath(storageKey);

  if (!existsSync(filePath)) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Attachment file not found');
  }

  return {
    stream: createReadStream(filePath),
    filePath,
  };
};

export const toPublicTicketAttachment = (attachment) => {
  if (!attachment?.storageKey) {
    return null;
  }

  return {
    originalFilename: attachment.originalFilename,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    uploadedAt: attachment.uploadedAt,
  };
};

export default {
  setUploadRootForTests,
  resetUploadRootForTests,
  getUploadRoot,
  ensureUploadDirectories,
  validateUploadedAttachmentFile,
  persistUploadedAttachment,
  removeTempFile,
  deleteStoredAttachment,
  openStoredAttachmentStream,
  resolveStoredFilePath,
  toPublicTicketAttachment,
};
