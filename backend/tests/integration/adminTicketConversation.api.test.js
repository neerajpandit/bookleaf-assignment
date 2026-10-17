import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { setupTestDb, teardownTestDb } from '../setup/testDb.js';
import { clearDatabase } from '../helpers/modelTestHelper.js';
import {
  createTestAuthor,
  createTestAdmin,
  loginDirect,
  samplePassword,
} from '../helpers/authHelper.js';
import {
  createTestInternalNote,
  createTestTicket,
  createTestTicketMessage,
} from '../helpers/ticketHelper.js';
import Ticket from '../../src/modules/tickets/ticket.model.js';
import TicketMessage from '../../src/modules/tickets/ticketMessage.model.js';
import InternalNote from '../../src/modules/tickets/internalNote.model.js';
import AuditLog from '../../src/modules/audit-logs/auditLog.model.js';
import { TICKET_STATUSES } from '../../src/constants/ticketStatus.js';
import { ROLES } from '../../src/constants/roles.js';
import { AUDIT_ACTIONS } from '../../src/constants/auditActions.js';

describe('Admin Ticket Conversation API', () => {
  let app;

  beforeAll(async () => {
    await setupTestDb();
    const { default: createApp } = await import('../../src/app.js');
    app = createApp();
  }, 60000);

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /api/v1/admin/tickets/:ticketId/messages', () => {
    it('allows an admin to send a public reply as ADMIN role', async () => {
      const author = await createTestAuthor({
        email: 'reply.author@bookleaf.test',
        authorId: 'AUTH101',
      });
      const admin = await createTestAdmin({
        email: 'reply.admin@bookleaf.test',
        name: 'Reply Admin',
      });
      const ticket = await createTestTicket(author._id, {
        ticketNumber: 'TKT-9101',
        lastMessageAt: new Date('2024-01-01T00:00:00.000Z'),
      });

      const { agent } = await loginDirect(app, {
        email: 'reply.admin@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent
        .post(`/api/v1/admin/tickets/${ticket._id.toString()}/messages`)
        .send({ body: 'We are reviewing your payout.' });

      expect(response.status).toBe(201);
      expect(response.body.data.message.body).toBe('We are reviewing your payout.');
      expect(response.body.data.message.senderRole).toBe(ROLES.ADMIN);

      const stored = await TicketMessage.findOne({ ticket: ticket._id, senderRole: ROLES.ADMIN });
      expect(stored).toBeTruthy();

      const updatedTicket = await Ticket.findById(ticket._id);
      expect(updatedTicket.lastMessageAt.getTime()).toBeGreaterThan(
        new Date('2024-01-01T00:00:00.000Z').getTime(),
      );
      expect(updatedTicket.status).toBe(TICKET_STATUSES.OPEN);

      const audit = await AuditLog.findOne({
        ticket: ticket._id,
        action: AUDIT_ACTIONS.PUBLIC_REPLY_SENT,
      });
      expect(audit.actor.toString()).toBe(admin._id.toString());
      expect(audit.metadata.messageId).toBe(stored._id.toString());
      expect(JSON.stringify(audit.metadata)).not.toContain('We are reviewing your payout.');
    });

    it('rejects author and unauthenticated access', async () => {
      const author = await createTestAuthor({
        email: 'blocked.author@bookleaf.test',
        authorId: 'AUTH102',
      });
      const ticket = await createTestTicket(author._id, { ticketNumber: 'TKT-9102' });

      const { agent } = await loginDirect(app, {
        email: 'blocked.author@bookleaf.test',
        password: samplePassword,
      });

      const authorResponse = await agent
        .post(`/api/v1/admin/tickets/${ticket._id.toString()}/messages`)
        .send({ body: 'Author attempt' });

      const unauthResponse = await request(app)
        .post(`/api/v1/admin/tickets/${ticket._id.toString()}/messages`)
        .send({ body: 'No auth' });

      expect(authorResponse.status).toBe(403);
      expect(unauthResponse.status).toBe(401);
    });

    it('rejects replies on closed tickets and spoofed sender fields', async () => {
      const author = await createTestAuthor({
        email: 'closedreply.author@bookleaf.test',
        authorId: 'AUTH103',
      });
      await createTestAdmin({ email: 'closedreply.admin@bookleaf.test' });
      const closedTicket = await createTestTicket(author._id, {
        ticketNumber: 'TKT-9103',
        status: TICKET_STATUSES.CLOSED,
      });
      const openTicket = await createTestTicket(author._id, {
        ticketNumber: 'TKT-9104',
      });

      const { agent } = await loginDirect(app, {
        email: 'closedreply.admin@bookleaf.test',
        password: samplePassword,
      });

      const closedResponse = await agent
        .post(`/api/v1/admin/tickets/${closedTicket._id.toString()}/messages`)
        .send({ body: 'Should fail' });

      const spoofResponse = await agent
        .post(`/api/v1/admin/tickets/${openTicket._id.toString()}/messages`)
        .send({ body: 'Spoof attempt', senderRole: ROLES.AUTHOR });

      expect(closedResponse.status).toBe(409);
      expect(spoofResponse.status).toBe(400);
    });

    it('reverts the reply when audit persistence fails', async () => {
      const author = await createTestAuthor({
        email: 'replyaudit.author@bookleaf.test',
        authorId: 'AUTH104',
      });
      await createTestAdmin({ email: 'replyaudit.admin@bookleaf.test' });
      const ticket = await createTestTicket(author._id, {
        ticketNumber: 'TKT-9105',
        lastMessageAt: new Date('2024-02-01T00:00:00.000Z'),
      });

      const auditSpy = jest
        .spyOn(AuditLog, 'create')
        .mockRejectedValueOnce(new Error('audit write failed'));

      const { agent } = await loginDirect(app, {
        email: 'replyaudit.admin@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent
        .post(`/api/v1/admin/tickets/${ticket._id.toString()}/messages`)
        .send({ body: 'Should rollback' });

      expect(response.status).toBe(500);
      expect(await TicketMessage.countDocuments({ ticket: ticket._id })).toBe(0);

      const storedTicket = await Ticket.findById(ticket._id);
      expect(storedTicket.lastMessageAt.toISOString()).toBe('2024-02-01T00:00:00.000Z');

      auditSpy.mockRestore();
    });
  });

  describe('GET /api/v1/admin/tickets/:ticketId/messages', () => {
    it('returns public messages without private notes', async () => {
      const author = await createTestAuthor({
        email: 'listmsg.author@bookleaf.test',
        authorId: 'AUTH105',
      });
      const admin = await createTestAdmin({ email: 'listmsg.admin@bookleaf.test' });
      const ticket = await createTestTicket(author._id, { ticketNumber: 'TKT-9201' });

      await createTestTicketMessage(ticket._id, author._id, { body: 'Author message' });
      await createTestTicketMessage(ticket._id, admin._id, {
        body: 'Admin public reply',
        senderRole: ROLES.ADMIN,
      });
      await createTestInternalNote(ticket._id, admin._id, { body: 'Private note content' });

      const { agent } = await loginDirect(app, {
        email: 'listmsg.admin@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get(`/api/v1/admin/tickets/${ticket._id.toString()}/messages`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.items.map((item) => item.body)).toEqual([
        'Author message',
        'Admin public reply',
      ]);
      expect(JSON.stringify(response.body)).not.toContain('Private note content');
      expect(JSON.stringify(response.body)).not.toMatch(/passwordHash/);
    });

    it('rejects author access to admin conversation endpoints', async () => {
      const author = await createTestAuthor({
        email: 'author.listmsg@bookleaf.test',
        authorId: 'AUTH106',
      });
      const ticket = await createTestTicket(author._id, { ticketNumber: 'TKT-9202' });

      const { agent } = await loginDirect(app, {
        email: 'author.listmsg@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get(`/api/v1/admin/tickets/${ticket._id.toString()}/messages`);
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/v1/admin/tickets/:ticketId/notes', () => {
    it('creates a private note without changing lastMessageAt or status', async () => {
      const author = await createTestAuthor({
        email: 'note.author@bookleaf.test',
        authorId: 'AUTH107',
      });
      const admin = await createTestAdmin({
        email: 'note.admin@bookleaf.test',
        name: 'Note Admin',
      });
      const ticket = await createTestTicket(author._id, {
        ticketNumber: 'TKT-9301',
        status: TICKET_STATUSES.IN_PROGRESS,
        lastMessageAt: new Date('2024-03-01T00:00:00.000Z'),
      });

      const { agent } = await loginDirect(app, {
        email: 'note.admin@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent
        .post(`/api/v1/admin/tickets/${ticket._id.toString()}/notes`)
        .send({ body: 'Escalated to finance team.' });

      expect(response.status).toBe(201);
      expect(response.body.data.note.body).toBe('Escalated to finance team.');
      expect(response.body.data.note.admin.email).toBe('note.admin@bookleaf.test');

      const storedTicket = await Ticket.findById(ticket._id);
      expect(storedTicket.status).toBe(TICKET_STATUSES.IN_PROGRESS);
      expect(storedTicket.lastMessageAt.toISOString()).toBe('2024-03-01T00:00:00.000Z');

      const audit = await AuditLog.findOne({
        ticket: ticket._id,
        action: AUDIT_ACTIONS.INTERNAL_NOTE_ADDED,
      });
      expect(audit.actor.toString()).toBe(admin._id.toString());
      expect(audit.metadata.noteId).toBeTruthy();
    });

    it('reverts note creation when audit persistence fails', async () => {
      const author = await createTestAuthor({
        email: 'noteaudit.author@bookleaf.test',
        authorId: 'AUTH108',
      });
      await createTestAdmin({ email: 'noteaudit.admin@bookleaf.test' });
      const ticket = await createTestTicket(author._id, { ticketNumber: 'TKT-9302' });

      const auditSpy = jest
        .spyOn(AuditLog, 'create')
        .mockRejectedValueOnce(new Error('audit write failed'));

      const { agent } = await loginDirect(app, {
        email: 'noteaudit.admin@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent
        .post(`/api/v1/admin/tickets/${ticket._id.toString()}/notes`)
        .send({ body: 'Should rollback' });

      expect(response.status).toBe(500);
      expect(await InternalNote.countDocuments({ ticket: ticket._id })).toBe(0);

      auditSpy.mockRestore();
    });
  });

  describe('GET /api/v1/admin/tickets/:ticketId/notes', () => {
    it('returns private notes for admins only', async () => {
      const author = await createTestAuthor({
        email: 'getnotes.author@bookleaf.test',
        authorId: 'AUTH109',
      });
      const admin = await createTestAdmin({
        email: 'getnotes.admin@bookleaf.test',
        name: 'Notes Admin',
      });
      const ticket = await createTestTicket(author._id, { ticketNumber: 'TKT-9401' });

      await createTestInternalNote(ticket._id, admin._id, { body: 'First private note' });
      await createTestTicketMessage(ticket._id, author._id, { body: 'Public only' });

      const { agent } = await loginDirect(app, {
        email: 'getnotes.admin@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get(`/api/v1/admin/tickets/${ticket._id.toString()}/notes`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].body).toBe('First private note');
      expect(JSON.stringify(response.body)).not.toContain('Public only');
    });

    it('keeps private notes out of author ticket detail responses', async () => {
      const author = await createTestAuthor({
        email: 'author.notes@bookleaf.test',
        authorId: 'AUTH110',
      });
      const admin = await createTestAdmin({ email: 'authornotes.admin@bookleaf.test' });
      const ticket = await createTestTicket(author._id, { ticketNumber: 'TKT-9402' });

      await createTestTicketMessage(ticket._id, author._id, { body: 'Visible message' });
      await createTestInternalNote(ticket._id, admin._id, { body: 'Hidden internal note' });

      const { agent: authorAgent } = await loginDirect(app, {
        email: 'author.notes@bookleaf.test',
        password: samplePassword,
      });
      const { agent: adminAgent } = await loginDirect(app, {
        email: 'authornotes.admin@bookleaf.test',
        password: samplePassword,
      });

      const authorDetail = await authorAgent.get(`/api/v1/tickets/${ticket._id.toString()}`);
      const authorBlockedNotes = await authorAgent.get(
        `/api/v1/admin/tickets/${ticket._id.toString()}/notes`,
      );
      const adminReplyVisibleToAuthor = await adminAgent
        .post(`/api/v1/admin/tickets/${ticket._id.toString()}/messages`)
        .send({ body: 'Admin reply visible to author' });

      expect(authorDetail.status).toBe(200);
      expect(JSON.stringify(authorDetail.body)).not.toContain('Hidden internal note');
      expect(authorBlockedNotes.status).toBe(403);
      expect(adminReplyVisibleToAuthor.status).toBe(201);

      const authorAfterReply = await authorAgent.get(`/api/v1/tickets/${ticket._id.toString()}`);
      expect(authorAfterReply.body.data.ticket.messages.some(
        (message) => message.body === 'Admin reply visible to author',
      )).toBe(true);
    });
  });

  describe('validation and missing tickets', () => {
    it('rejects invalid ticket IDs and empty bodies', async () => {
      await createTestAdmin({ email: 'invalid.admin@bookleaf.test' });
      const { agent } = await loginDirect(app, {
        email: 'invalid.admin@bookleaf.test',
        password: samplePassword,
      });

      const invalidTicket = await agent
        .post('/api/v1/admin/tickets/not-a-valid-id/messages')
        .send({ body: 'Hello' });
      const emptyBody = await agent
        .post('/api/v1/admin/tickets/507f1f77bcf86cd799439011/messages')
        .send({ body: '   ' });
      const missingTicket = await agent
        .post('/api/v1/admin/tickets/507f1f77bcf86cd799439011/messages')
        .send({ body: 'Valid body' });

      expect(invalidTicket.status).toBe(400);
      expect(emptyBody.status).toBe(400);
      expect(missingTicket.status).toBe(404);
    });
  });
});
