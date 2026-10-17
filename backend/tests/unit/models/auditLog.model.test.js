import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import User from '../../../src/modules/users/user.model.js';
import Ticket from '../../../src/modules/tickets/ticket.model.js';
import AuditLog from '../../../src/modules/audit-logs/auditLog.model.js';
import { ROLES } from '../../../src/constants/roles.js';
import { TICKET_STATUSES } from '../../../src/constants/ticketStatus.js';
import { AUDIT_ACTIONS } from '../../../src/constants/auditActions.js';
import { setupTestDb, teardownTestDb } from '../../setup/testDb.js';
import { clearDatabase, samplePasswordHash } from '../../helpers/modelTestHelper.js';

describe('AuditLog model', () => {
  let admin;
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

    admin = await User.create({
      email: 'admin@bookleaf.test',
      passwordHash: samplePasswordHash,
      role: ROLES.ADMIN,
      name: 'Support Admin',
    });

    ticket = await Ticket.create({
      ticketNumber: 'TKT-000030',
      author: author._id,
      subject: 'Audit trail ticket',
      description: 'Track administrative changes.',
      status: TICKET_STATUSES.OPEN,
    });
  });

  it('creates a valid audit log with optional ticket reference', async () => {
    const log = await AuditLog.create({
      ticket: ticket._id,
      actor: admin._id,
      action: AUDIT_ACTIONS.TICKET_STATUS_CHANGED,
      oldValue: TICKET_STATUSES.OPEN,
      newValue: TICKET_STATUSES.IN_PROGRESS,
      metadata: { source: 'admin-dashboard' },
    });

    expect(log.ticket.toString()).toBe(ticket._id.toString());
    expect(log.action).toBe(AUDIT_ACTIONS.TICKET_STATUS_CHANGED);
    expect(log.oldValue).toBe(TICKET_STATUSES.OPEN);
    expect(log.newValue).toBe(TICKET_STATUSES.IN_PROGRESS);
  });

  it('creates a system-level audit log without a ticket reference', async () => {
    const log = await AuditLog.create({
      actor: admin._id,
      action: AUDIT_ACTIONS.AI_CLASSIFICATION_FAILED,
      metadata: { reason: 'Provider timeout' },
    });

    expect(log.ticket).toBeNull();
  });

  it('requires actor and action fields', async () => {
    const log = new AuditLog({});

    await expect(log.validate()).rejects.toThrow(/Actor reference is required/);
  });

  it('rejects invalid audit actions', async () => {
    const log = new AuditLog({
      actor: admin._id,
      action: 'UNKNOWN_ACTION',
    });

    await expect(log.validate()).rejects.toThrow(/not a valid audit action/);
  });

  it('stores ObjectId references for ticket and actor', () => {
    const ticketId = new mongoose.Types.ObjectId();
    const actorId = new mongoose.Types.ObjectId();

    const log = new AuditLog({
      ticket: ticketId,
      actor: actorId,
      action: AUDIT_ACTIONS.TICKET_CREATED,
    });

    expect(log.ticket).toEqual(ticketId);
    expect(log.actor).toEqual(actorId);
  });
});
