import ApiError from '../../utils/ApiError.js';
import httpStatus from '../../constants/httpStatus.js';
import { ROLES } from '../../constants/roles.js';
import { TICKET_STATUSES } from '../../constants/ticketStatus.js';
import { AUDIT_ACTIONS } from '../../constants/auditActions.js';
import Ticket from '../tickets/ticket.model.js';
import TicketMessage from '../tickets/ticketMessage.model.js';
import InternalNote from '../tickets/internalNote.model.js';
import { toPublicTicketMessage } from '../tickets/ticket.service.js';
import { persistWithAuditEntries } from './auditHelper.js';
import { invalidateAiDraftAfterConversationUpdate } from '../ai/aiDraftLifecycle.js';

const getTicketOrThrow = async (ticketId) => {
  const ticket = await Ticket.findById(ticketId);

  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  }

  return ticket;
};

export const toAdminInternalNote = (note) => ({
  id: note._id.toString(),
  body: note.body,
  admin: {
    id: note.admin._id.toString(),
    name: note.admin.name ?? null,
    email: note.admin.email,
  },
  createdAt: note.createdAt,
});

export const listAdminTicketMessages = async (ticketId, query) => {
  await getTicketOrThrow(ticketId);

  const { page, limit } = query;
  const skip = (page - 1) * limit;
  const filter = { ticket: ticketId };

  const [messages, total] = await Promise.all([
    TicketMessage.find(filter)
      .sort({ createdAt: 1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'sender', select: 'name' }),
    TicketMessage.countDocuments(filter),
  ]);

  return {
    items: messages.map(toPublicTicketMessage),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

export const sendAdminTicketReply = async (adminUserId, ticketId, payload) => {
  const ticket = await getTicketOrThrow(ticketId);

  if (ticket.status === TICKET_STATUSES.CLOSED) {
    throw new ApiError(httpStatus.CONFLICT, 'Cannot add messages to a closed ticket');
  }

  const previousLastMessageAt = ticket.lastMessageAt;
  const now = new Date();

  const result = await persistWithAuditEntries({
    persist: async () => {
      const message = await TicketMessage.create({
        ticket: ticket._id,
        sender: adminUserId,
        senderRole: ROLES.ADMIN,
        body: payload.body,
      });

      ticket.lastMessageAt = now;
      invalidateAiDraftAfterConversationUpdate(ticket);
      await ticket.save();
      await message.populate({ path: 'sender', select: 'name' });

      return { message, ticketId: ticket._id, previousLastMessageAt };
    },
    buildAuditEntries: ({ message, ticketId: persistedTicketId }) => [
      {
        ticketId: persistedTicketId,
        actorId: adminUserId,
        action: AUDIT_ACTIONS.PUBLIC_REPLY_SENT,
        metadata: { messageId: message._id.toString() },
      },
    ],
    rollback: async ({ message, ticketId: persistedTicketId, previousLastMessageAt }) => {
      await TicketMessage.deleteOne({ _id: message._id });

      await Ticket.updateOne(
        { _id: persistedTicketId },
        { $set: { lastMessageAt: previousLastMessageAt } },
      );
    },
  });

  return {
    message: toPublicTicketMessage(result.message),
    lastMessageAt: now,
  };
};

export const createAdminInternalNote = async (adminUserId, ticketId, payload) => {
  await getTicketOrThrow(ticketId);

  const result = await persistWithAuditEntries({
    persist: async () => {
      const note = await InternalNote.create({
        ticket: ticketId,
        admin: adminUserId,
        body: payload.body,
      });

      await note.populate({ path: 'admin', select: 'name email' });
      return { note, ticketId };
    },
    buildAuditEntries: ({ note, ticketId: persistedTicketId }) => [
      {
        ticketId: persistedTicketId,
        actorId: adminUserId,
        action: AUDIT_ACTIONS.INTERNAL_NOTE_ADDED,
        metadata: { noteId: note._id.toString() },
      },
    ],
    rollback: async ({ note }) => {
      await InternalNote.deleteOne({ _id: note._id });
    },
  });

  return {
    note: toAdminInternalNote(result.note),
  };
};

export const listAdminInternalNotes = async (ticketId, query) => {
  await getTicketOrThrow(ticketId);

  const { page, limit } = query;
  const skip = (page - 1) * limit;
  const filter = { ticket: ticketId };

  const [notes, total] = await Promise.all([
    InternalNote.find(filter)
      .sort({ createdAt: 1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'admin', select: 'name email' }),
    InternalNote.countDocuments(filter),
  ]);

  return {
    items: notes.map(toAdminInternalNote),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

export default {
  listAdminTicketMessages,
  sendAdminTicketReply,
  createAdminInternalNote,
  listAdminInternalNotes,
  toAdminInternalNote,
};
