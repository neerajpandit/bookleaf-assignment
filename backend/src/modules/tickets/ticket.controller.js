import ApiResponse from '../../utils/ApiResponse.js';
import httpStatus from '../../constants/httpStatus.js';
import asyncHandler from '../../utils/asyncHandler.js';
import {
  addAuthorTicketMessage,
  createAuthorTicket,
  getAuthorTicketAttachmentStream,
  getAuthorTicketById,
  listAuthorTickets,
} from './ticket.service.js';

export const createTicket = asyncHandler(async (req, res) => {
  const data = await createAuthorTicket(req.auth.userId, req.body, req.file ?? null);

  res.status(httpStatus.CREATED).json(
    new ApiResponse(httpStatus.CREATED, data, 'Ticket created successfully'),
  );
});

export const listTickets = asyncHandler(async (req, res) => {
  const data = await listAuthorTickets(req.auth.userId, req.query);

  res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, data, 'Tickets retrieved successfully'),
  );
});

export const getTicket = asyncHandler(async (req, res) => {
  const ticket = await getAuthorTicketById(req.auth.userId, req.params.ticketId);

  res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, { ticket }, 'Ticket retrieved successfully'),
  );
});

export const addTicketMessage = asyncHandler(async (req, res) => {
  const data = await addAuthorTicketMessage(req.auth.userId, req.params.ticketId, req.body);

  res.status(httpStatus.CREATED).json(
    new ApiResponse(httpStatus.CREATED, data, 'Message added successfully'),
  );
});

export const downloadTicketAttachment = asyncHandler(async (req, res) => {
  const { stream, attachment } = await getAuthorTicketAttachmentStream(
    req.auth.userId,
    req.params.ticketId,
  );

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
  createTicket,
  listTickets,
  getTicket,
  addTicketMessage,
  downloadTicketAttachment,
};
