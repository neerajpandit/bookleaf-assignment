import Ticket from '../../src/modules/tickets/ticket.model.js';
import TicketMessage from '../../src/modules/tickets/ticketMessage.model.js';
import InternalNote from '../../src/modules/tickets/internalNote.model.js';
import { TICKET_STATUSES } from '../../src/constants/ticketStatus.js';
import { ROLES } from '../../src/constants/roles.js';
import { AI_PROCESSING_STATUSES } from '../../src/constants/aiProcessingStatus.js';

export const createTestTicket = async (authorUserId, overrides = {}) => {
  const ticket = await Ticket.create({
    ticketNumber: overrides.ticketNumber || 'TKT-9001',
    author: authorUserId,
    subject: 'Test ticket subject',
    description: 'Initial ticket description',
    status: TICKET_STATUSES.OPEN,
    aiProcessingStatus: AI_PROCESSING_STATUSES.PENDING,
    lastMessageAt: new Date(),
    ...overrides,
  });

  return ticket;
};

export const createTestTicketMessage = async (ticketId, senderUserId, overrides = {}) =>
  TicketMessage.create({
    ticket: ticketId,
    sender: senderUserId,
    senderRole: ROLES.AUTHOR,
    body: 'Initial public message',
    ...overrides,
  });

export const createTestInternalNote = async (ticketId, adminUserId, overrides = {}) =>
  InternalNote.create({
    ticket: ticketId,
    admin: adminUserId,
    body: 'Internal admin-only note',
    ...overrides,
  });
