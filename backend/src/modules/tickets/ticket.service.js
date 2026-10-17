import ApiError from '../../utils/ApiError.js';
import httpStatus from '../../constants/httpStatus.js';
import { ROLES } from '../../constants/roles.js';
import { TICKET_STATUSES } from '../../constants/ticketStatus.js';
import { TICKET_CONTEXTS } from '../../constants/ticketContext.js';
import { AI_PROCESSING_STATUSES } from '../../constants/aiProcessingStatus.js';
import { AUDIT_ACTIONS } from '../../constants/auditActions.js';
import Book from '../books/book.model.js';
import AuditLog from '../audit-logs/auditLog.model.js';
import Ticket from './ticket.model.js';
import TicketMessage from './ticketMessage.model.js';
import { generateTicketNumber } from './ticketNumber.service.js';
import { applyPolicySuggestionToTicket } from './ticketPolicyClassification.service.js';
import {
  deleteStoredAttachment,
  openStoredAttachmentStream,
  persistUploadedAttachment,
  removeTempFile,
  toPublicTicketAttachment,
} from '../attachments/ticketAttachment.service.js';
import { escapeRegex } from '../../utils/escapeRegex.js';
import { invalidateAiDraftAfterConversationUpdate } from '../ai/aiDraftLifecycle.js';
import { queueTicketAnalysis } from '../ai/aiAnalysis.service.js';

const toPublicBookSummary = (book) => {
  if (!book) {
    return null;
  }

  return {
    bookId: book.bookId,
    title: book.title,
  };
};

export const toPublicTicketMessage = (message) => ({
  id: message._id.toString(),
  body: message.body,
  senderRole: message.senderRole,
  senderName: message.sender?.name ?? null,
  createdAt: message.createdAt,
});

export const toPublicTicket = (ticket, { includeMessages = false } = {}) => {
  const payload = {
    id: ticket._id.toString(),
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    category: ticket.category ?? null,
    priority: ticket.priority ?? null,
    book: toPublicBookSummary(ticket.book),
    attachment: toPublicTicketAttachment(ticket.attachment),
    lastMessageAt: ticket.lastMessageAt ?? null,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };

  if (includeMessages) {
    payload.messages = (ticket.messages || []).map(toPublicTicketMessage);
  }

  return payload;
};

const resolveCategoryContext = ({ bookId, categoryContext }) => {
  if (categoryContext) {
    return categoryContext;
  }

  return bookId ? TICKET_CONTEXTS.BOOK_SPECIFIC : TICKET_CONTEXTS.GENERAL_ACCOUNT;
};

export const resolveTicketBook = async (authorUserId, { bookId, categoryContext }) => {
  const resolvedContext = resolveCategoryContext({ bookId, categoryContext });

  if (resolvedContext === TICKET_CONTEXTS.GENERAL_ACCOUNT) {
    if (bookId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'General account tickets cannot reference a book',
      );
    }

    return null;
  }

  if (!bookId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'bookId is required for book-specific tickets');
  }

  const book = await Book.findOne({ bookId, author: authorUserId }).select('_id bookId title');

  if (!book) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Book not found');
  }

  return book;
};

const cleanupFailedTicketCreation = async (ticketId) => {
  if (!ticketId) {
    return;
  }

  await Promise.all([
    Ticket.deleteOne({ _id: ticketId }),
    TicketMessage.deleteMany({ ticket: ticketId }),
    AuditLog.deleteMany({ ticket: ticketId }),
  ]);
};

export const createAuthorTicket = async (authorUserId, payload, uploadedFile = null) => {
  const book = await resolveTicketBook(authorUserId, payload);
  const ticketNumber = await generateTicketNumber();
  const now = new Date();
  let ticket = null;
  let attachmentMetadata = null;
  let tempFilePath = uploadedFile?.path ?? null;

  try {
    attachmentMetadata = await persistUploadedAttachment(uploadedFile);
    tempFilePath = null;

    ticket = await Ticket.create({
      ticketNumber,
      author: authorUserId,
      book: book?._id ?? null,
      subject: payload.subject,
      description: payload.description,
      status: TICKET_STATUSES.OPEN,
      category: null,
      priority: null,
      priorityOverride: false,
      aiProcessingStatus: AI_PROCESSING_STATUSES.PENDING,
      lastMessageAt: now,
      attachment: attachmentMetadata,
    });

    const message = await TicketMessage.create({
      ticket: ticket._id,
      sender: authorUserId,
      senderRole: ROLES.AUTHOR,
      body: payload.description,
    });

    await AuditLog.create({
      ticket: ticket._id,
      actor: authorUserId,
      action: AUDIT_ACTIONS.TICKET_CREATED,
      metadata: { ticketNumber },
    });

    ticket.book = book;
    await applyPolicySuggestionToTicket(ticket._id, { actorId: authorUserId });
    queueTicketAnalysis(ticket._id);
    const refreshedTicket = await Ticket.findById(ticket._id).populate({
      path: 'book',
      select: 'bookId title',
    });

    return {
      ticket: toPublicTicket(refreshedTicket),
      initialMessage: toPublicTicketMessage(message),
    };
  } catch (error) {
    if (attachmentMetadata?.storageKey) {
      await deleteStoredAttachment(attachmentMetadata.storageKey);
    }
    await cleanupFailedTicketCreation(ticket?._id);
    throw error;
  } finally {
    if (tempFilePath) {
      await removeTempFile(tempFilePath);
    }
  }
};

export const getAuthorTicketAttachmentStream = async (authorUserId, ticketId) => {
  const ticket = await Ticket.findOne({ _id: ticketId, author: authorUserId }).select('attachment');

  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  }

  if (!ticket.attachment?.storageKey) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Attachment not found');
  }

  const { stream } = openStoredAttachmentStream(ticket.attachment.storageKey);

  return {
    stream,
    attachment: ticket.attachment,
  };
};

const buildAuthorTicketFilter = (authorUserId, query) => {
  const filter = { author: authorUserId };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.category) {
    filter.category = query.category;
  }

  if (query.search) {
    const escapedSearch = escapeRegex(query.search);
    filter.$or = [
      { ticketNumber: { $regex: escapedSearch, $options: 'i' } },
      { subject: { $regex: escapedSearch, $options: 'i' } },
    ];
  }

  return filter;
};

export const listAuthorTickets = async (authorUserId, query) => {
  const { page, limit } = query;
  const filter = buildAuthorTicketFilter(authorUserId, query);
  const skip = (page - 1) * limit;

  const [tickets, total] = await Promise.all([
    Ticket.find(filter)
      .populate({ path: 'book', select: 'bookId title' })
      .sort({ lastMessageAt: -1, updatedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit),
    Ticket.countDocuments(filter),
  ]);

  return {
    items: tickets.map((ticket) => toPublicTicket(ticket)),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

export const getAuthorTicketById = async (authorUserId, ticketId) => {
  const ticket = await Ticket.findOne({ _id: ticketId, author: authorUserId }).populate({
    path: 'book',
    select: 'bookId title',
  });

  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  }

  const messages = await TicketMessage.find({ ticket: ticket._id })
    .sort({ createdAt: 1, _id: 1 })
    .populate({ path: 'sender', select: 'name' });

  ticket.messages = messages;

  return toPublicTicket(ticket, { includeMessages: true });
};

export const addAuthorTicketMessage = async (authorUserId, ticketId, payload) => {
  const ticket = await Ticket.findOne({ _id: ticketId, author: authorUserId });

  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  }

  if (ticket.status === TICKET_STATUSES.CLOSED) {
    throw new ApiError(httpStatus.CONFLICT, 'Cannot add messages to a closed ticket');
  }

  const now = new Date();
  const message = await TicketMessage.create({
    ticket: ticket._id,
    sender: authorUserId,
    senderRole: ROLES.AUTHOR,
    body: payload.body,
  });

  ticket.lastMessageAt = now;
  invalidateAiDraftAfterConversationUpdate(ticket);
  await ticket.save();

  await message.populate({ path: 'sender', select: 'name' });

  return {
    message: toPublicTicketMessage(message),
    lastMessageAt: ticket.lastMessageAt,
  };
};

export default {
  createAuthorTicket,
  listAuthorTickets,
  getAuthorTicketById,
  addAuthorTicketMessage,
  getAuthorTicketAttachmentStream,
  toPublicTicket,
  toPublicTicketMessage,
};
