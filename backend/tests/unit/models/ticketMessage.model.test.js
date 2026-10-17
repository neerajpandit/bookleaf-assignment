import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import User from '../../../src/modules/users/user.model.js';
import Ticket from '../../../src/modules/tickets/ticket.model.js';
import TicketMessage from '../../../src/modules/tickets/ticketMessage.model.js';
import { ROLES } from '../../../src/constants/roles.js';
import { TICKET_STATUSES } from '../../../src/constants/ticketStatus.js';
import { setupTestDb, teardownTestDb } from '../../setup/testDb.js';
import { clearDatabase, samplePasswordHash } from '../../helpers/modelTestHelper.js';

describe('TicketMessage model', () => {
  let author;
  let ticket;

  beforeAll(async () => {
    await setupTestDb();
  }, 60000);

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearDatabase();

    author = await User.create({
      email: 'author@bookleaf.test',
      passwordHash: samplePasswordHash,
      role: ROLES.AUTHOR,
      authorId: 'AUTH001',
      name: 'Priya Sharma',
    });

    ticket = await Ticket.create({
      ticketNumber: 'TKT-000010',
      author: author._id,
      subject: 'Need help',
      description: 'Please review my ticket.',
      status: TICKET_STATUSES.OPEN,
    });
  });

  it('creates a valid public ticket message', async () => {
    const message = await TicketMessage.create({
      ticket: ticket._id,
      sender: author._id,
      senderRole: ROLES.AUTHOR,
      body: 'Thank you for looking into this.',
    });

    expect(message.ticket.toString()).toBe(ticket._id.toString());
    expect(message.sender.toString()).toBe(author._id.toString());
    expect(message.senderRole).toBe(ROLES.AUTHOR);
    expect(message.body).toBe('Thank you for looking into this.');
  });

  it('requires ticket, sender, senderRole, and body', async () => {
    const message = new TicketMessage({});

    await expect(message.validate()).rejects.toThrow(/Ticket reference is required/);
  });

  it('stores ObjectId references for ticket and sender', () => {
    const ticketId = new mongoose.Types.ObjectId();
    const senderId = new mongoose.Types.ObjectId();

    const message = new TicketMessage({
      ticket: ticketId,
      sender: senderId,
      senderRole: ROLES.ADMIN,
      body: 'We are reviewing your request.',
    });

    expect(message.ticket).toEqual(ticketId);
    expect(message.sender).toEqual(senderId);
  });
});
