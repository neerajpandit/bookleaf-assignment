import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import User from '../../../src/modules/users/user.model.js';
import Ticket from '../../../src/modules/tickets/ticket.model.js';
import InternalNote from '../../../src/modules/tickets/internalNote.model.js';
import { ROLES } from '../../../src/constants/roles.js';
import { TICKET_STATUSES } from '../../../src/constants/ticketStatus.js';
import { setupTestDb, teardownTestDb } from '../../setup/testDb.js';
import { clearDatabase, samplePasswordHash } from '../../helpers/modelTestHelper.js';

describe('InternalNote model', () => {
  let author;
  let admin;
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

    admin = await User.create({
      email: 'admin@bookleaf.test',
      passwordHash: samplePasswordHash,
      role: ROLES.ADMIN,
      name: 'Support Admin',
    });

    ticket = await Ticket.create({
      ticketNumber: 'TKT-000020',
      author: author._id,
      subject: 'Escalated issue',
      description: 'Needs internal follow-up.',
      status: TICKET_STATUSES.IN_PROGRESS,
    });
  });

  it('creates a valid administrator-only internal note', async () => {
    const note = await InternalNote.create({
      ticket: ticket._id,
      admin: admin._id,
      body: 'Escalated to production team for review.',
    });

    expect(note.ticket.toString()).toBe(ticket._id.toString());
    expect(note.admin.toString()).toBe(admin._id.toString());
    expect(note.body).toBe('Escalated to production team for review.');
  });

  it('requires ticket, admin, and body fields', async () => {
    const note = new InternalNote({});

    await expect(note.validate()).rejects.toThrow(/Ticket reference is required/);
  });

  it('rejects an empty note body after trimming', async () => {
    const note = new InternalNote({
      ticket: ticket._id,
      admin: admin._id,
      body: '   ',
    });

    await expect(note.validate()).rejects.toThrow(/Note body is required/);
  });

  it('stores ObjectId references for ticket and admin', () => {
    const ticketId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();

    const note = new InternalNote({
      ticket: ticketId,
      admin: adminId,
      body: 'Internal follow-up required.',
    });

    expect(note.ticket).toEqual(ticketId);
    expect(note.admin).toEqual(adminId);
  });
});
