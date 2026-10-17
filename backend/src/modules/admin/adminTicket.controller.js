import ApiResponse from '../../utils/ApiResponse.js';
import httpStatus from '../../constants/httpStatus.js';
import asyncHandler from '../../utils/asyncHandler.js';
import {
  listAdminTickets,
  getAdminTicketById,
  getAdminTicketAttachmentStream,
  updateAdminTicketAssignment,
  updateAdminTicketClassification,
  updateAdminTicketStatus,
} from './adminTicket.service.js';
import { regenerateAdminTicketAiDraft } from './adminAi.service.js';
import {
  createAdminInternalNote,
  listAdminInternalNotes,
  listAdminTicketMessages,
  sendAdminTicketReply,
} from './adminTicketConversation.service.js';

export const getAdminTicketQueue = asyncHandler(async (req, res) => {
  const data = await listAdminTickets(req.query);

  res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, data, 'Admin ticket queue retrieved successfully'),
  );
});

export const getAdminTicketDetail = asyncHandler(async (req, res) => {
  const ticket = await getAdminTicketById(req.params.ticketId, {
    adminUserId: req.auth.userId,
    ensureAiDraft: true,
  });

  res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, { ticket }, 'Admin ticket detail retrieved successfully'),
  );
});

export const patchAdminTicketAssignment = asyncHandler(async (req, res) => {
  const ticket = await updateAdminTicketAssignment(
    req.auth.userId,
    req.params.ticketId,
    req.body,
  );

  res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, { ticket }, 'Ticket assignment updated successfully'),
  );
});

export const patchAdminTicketStatus = asyncHandler(async (req, res) => {
  const ticket = await updateAdminTicketStatus(req.auth.userId, req.params.ticketId, req.body);

  res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, { ticket }, 'Ticket status updated successfully'),
  );
});

export const patchAdminTicketClassification = asyncHandler(async (req, res) => {
  const ticket = await updateAdminTicketClassification(
    req.auth.userId,
    req.params.ticketId,
    req.body,
  );

  res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, { ticket }, 'Ticket classification updated successfully'),
  );
});

export const getAdminTicketMessages = asyncHandler(async (req, res) => {
  const data = await listAdminTicketMessages(req.params.ticketId, req.query);

  res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, data, 'Public ticket messages retrieved successfully'),
  );
});

export const postAdminTicketMessage = asyncHandler(async (req, res) => {
  const data = await sendAdminTicketReply(req.auth.userId, req.params.ticketId, req.body);

  res.status(httpStatus.CREATED).json(
    new ApiResponse(httpStatus.CREATED, data, 'Public reply sent successfully'),
  );
});

export const getAdminInternalNotes = asyncHandler(async (req, res) => {
  const data = await listAdminInternalNotes(req.params.ticketId, req.query);

  res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, data, 'Internal notes retrieved successfully'),
  );
});

export const postAdminInternalNote = asyncHandler(async (req, res) => {
  const data = await createAdminInternalNote(req.auth.userId, req.params.ticketId, req.body);

  res.status(httpStatus.CREATED).json(
    new ApiResponse(httpStatus.CREATED, data, 'Internal note created successfully'),
  );
});

export const postAdminTicketAiDraft = asyncHandler(async (req, res) => {
  const ticket = await regenerateAdminTicketAiDraft(req.auth.userId, req.params.ticketId);

  res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, { ticket }, 'AI draft regenerated successfully'),
  );
});

export const downloadAdminTicketAttachment = asyncHandler(async (req, res) => {
  const { stream, attachment } = await getAdminTicketAttachmentStream(req.params.ticketId);

  res.setHeader('Content-Type', attachment.mimeType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(attachment.originalFilename)}"`,
  );
  res.setHeader('Content-Length', String(attachment.sizeBytes));

  stream.on('error', () => {
    if (!res.headersSent) {
      res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Attachment file not found',
      });
    }
  });

  stream.pipe(res);
});

export default {
  getAdminTicketQueue,
  getAdminTicketDetail,
  downloadAdminTicketAttachment,
  patchAdminTicketAssignment,
  patchAdminTicketStatus,
  patchAdminTicketClassification,
  getAdminTicketMessages,
  postAdminTicketMessage,
  getAdminInternalNotes,
  postAdminInternalNote,
  postAdminTicketAiDraft,
};
