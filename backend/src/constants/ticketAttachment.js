export const TICKET_ATTACHMENT_STORAGE_PROVIDER = 'local';

/** 5 MB */
export const TICKET_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

export const TICKET_ATTACHMENT_FIELD_NAME = 'attachment';

export const TICKET_ATTACHMENT_ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.txt'];

export const TICKET_ATTACHMENT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'text/plain',
];

export default {
  TICKET_ATTACHMENT_STORAGE_PROVIDER,
  TICKET_ATTACHMENT_MAX_BYTES,
  TICKET_ATTACHMENT_FIELD_NAME,
  TICKET_ATTACHMENT_ALLOWED_EXTENSIONS,
  TICKET_ATTACHMENT_ALLOWED_MIME_TYPES,
};
