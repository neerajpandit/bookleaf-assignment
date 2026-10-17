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
import { createTestBook } from '../helpers/bookHelper.js';
import { createTestTicket } from '../helpers/ticketHelper.js';
import Ticket from '../../src/modules/tickets/ticket.model.js';
import AuditLog from '../../src/modules/audit-logs/auditLog.model.js';
import User from '../../src/modules/users/user.model.js';
import { TICKET_STATUSES } from '../../src/constants/ticketStatus.js';
import { TICKET_CATEGORIES } from '../../src/constants/ticketCategory.js';
import { TICKET_PRIORITIES } from '../../src/constants/ticketPriority.js';
import { AI_PROCESSING_STATUSES } from '../../src/constants/aiProcessingStatus.js';
import { hashPassword } from '../../src/utils/password.js';

describe('Admin Tickets API', () => {
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

  const loginAdmin = (email = 'admin.queue@bookleaf.test') =>
    loginDirect(app, { email, password: samplePassword });

  describe('GET /api/v1/admin/tickets', () => {
    it('returns the admin ticket queue for an authenticated admin', async () => {
      const author = await createTestAuthor({
        email: 'queue.author@bookleaf.test',
        authorId: 'AUTH001',
        name: 'Queue Author',
      });
      await createTestAdmin({ email: 'admin.queue@bookleaf.test' });
      await createTestBook(author._id, { bookId: 'BK001' });
      await createTestTicket(author._id, {
        ticketNumber: 'TKT-5001',
        subject: 'Royalty payout question',
        status: TICKET_STATUSES.OPEN,
        category: TICKET_CATEGORIES.ROYALTY_PAYMENTS,
        priority: TICKET_PRIORITIES.HIGH,
      });

      const { agent } = await loginAdmin();
      const response = await agent.get('/api/v1/admin/tickets');

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].author).toMatchObject({
        email: 'queue.author@bookleaf.test',
        authorId: 'AUTH001',
        name: 'Queue Author',
      });
      expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|aiError|Private admin note/);
    });

    it('rejects author access to admin endpoints', async () => {
      await createTestAuthor({ email: 'author.admin@bookleaf.test', authorId: 'AUTH002' });
      const { agent } = await loginDirect(app, {
        email: 'author.admin@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get('/api/v1/admin/tickets');
      expect(response.status).toBe(403);
    });

    it('rejects unauthenticated requests', async () => {
      const response = await request(app).get('/api/v1/admin/tickets');
      expect(response.status).toBe(401);
    });

    it('applies pagination and supported filters together', async () => {
      const author = await createTestAuthor({
        email: 'filter.author@bookleaf.test',
        authorId: 'AUTH003',
      });
      const admin = await createTestAdmin({ email: 'admin.queue@bookleaf.test' });

      await createTestTicket(author._id, {
        ticketNumber: 'TKT-5002',
        subject: 'Open royalty issue',
        status: TICKET_STATUSES.OPEN,
        category: TICKET_CATEGORIES.ROYALTY_PAYMENTS,
        priority: TICKET_PRIORITIES.HIGH,
        assignedAdmin: admin._id,
        createdAt: new Date('2024-01-10T00:00:00.000Z'),
        lastMessageAt: new Date('2024-01-10T00:00:00.000Z'),
      });
      await createTestTicket(author._id, {
        ticketNumber: 'TKT-5003',
        subject: 'Closed general inquiry',
        status: TICKET_STATUSES.CLOSED,
        category: TICKET_CATEGORIES.GENERAL_INQUIRY,
        priority: TICKET_PRIORITIES.LOW,
        createdAt: new Date('2024-02-10T00:00:00.000Z'),
        lastMessageAt: new Date('2024-02-10T00:00:00.000Z'),
      });

      const { agent } = await loginAdmin();
      const response = await agent.get(
        `/api/v1/admin/tickets?status=${TICKET_STATUSES.OPEN}&category=${encodeURIComponent(TICKET_CATEGORIES.ROYALTY_PAYMENTS)}&priority=${TICKET_PRIORITIES.HIGH}&assignedTo=${admin._id.toString()}&dateFrom=2024-01-01&dateTo=2024-01-31&page=1&limit=10`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].ticketNumber).toBe('TKT-5002');
    });

    it('filters the queue by AI processing status and exposes status on list items', async () => {
      const author = await createTestAuthor({
        email: 'ai-filter.author@bookleaf.test',
        authorId: 'AUTH006A',
      });
      await createTestAdmin({ email: 'admin.queue@bookleaf.test' });

      await createTestTicket(author._id, {
        ticketNumber: 'TKT-AI-1',
        aiProcessingStatus: AI_PROCESSING_STATUSES.FAILED,
      });
      await createTestTicket(author._id, {
        ticketNumber: 'TKT-AI-2',
        aiProcessingStatus: AI_PROCESSING_STATUSES.COMPLETED,
      });

      const { agent } = await loginAdmin();
      const response = await agent.get(
        `/api/v1/admin/tickets?aiProcessingStatus=${AI_PROCESSING_STATUSES.FAILED}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].ticketNumber).toBe('TKT-AI-1');
      expect(response.body.data.items[0].aiProcessingStatus).toBe(AI_PROCESSING_STATUSES.FAILED);
      expect(JSON.stringify(response.body.data.items[0])).not.toMatch(/aiDraftResponse|aiError/);
    });

    it('rejects invalid filter values and invalid date ranges', async () => {
      await createTestAdmin({ email: 'admin.queue@bookleaf.test' });
      const { agent } = await loginAdmin();

      const invalidStatus = await agent.get('/api/v1/admin/tickets?status=OPENED');
      const invalidCategory = await agent.get('/api/v1/admin/tickets?category=Payments');
      const invalidPriority = await agent.get('/api/v1/admin/tickets?priority=URGENT');
      const invalidAssignee = await agent.get('/api/v1/admin/tickets?assignedTo=not-an-id');
      const invalidAiStatus = await agent.get('/api/v1/admin/tickets?aiProcessingStatus=UNKNOWN');
      const invalidDates = await agent.get(
        '/api/v1/admin/tickets?dateFrom=2024-05-01&dateTo=2024-01-01',
      );

      expect(invalidStatus.status).toBe(400);
      expect(invalidCategory.status).toBe(400);
      expect(invalidPriority.status).toBe(400);
      expect(invalidAssignee.status).toBe(400);
      expect(invalidAiStatus.status).toBe(400);
      expect(invalidDates.status).toBe(400);
    });

    it('supports search by ticket number, subject, and author email', async () => {
      const author = await createTestAuthor({
        email: 'search.author@bookleaf.test',
        authorId: 'AUTH004',
        name: 'Searchable Author',
      });
      await createTestAdmin({ email: 'admin.queue@bookleaf.test' });
      await createTestTicket(author._id, {
        ticketNumber: 'TKT-SEARCH-1',
        subject: 'Unique subject marker',
      });
      await createTestTicket(author._id, {
        ticketNumber: 'TKT-OTHER-1',
        subject: 'Different topic',
      });

      const { agent } = await loginAdmin();

      const byNumber = await agent.get('/api/v1/admin/tickets?search=SEARCH-1');
      const bySubject = await agent.get('/api/v1/admin/tickets?search=Unique subject');
      const byAuthor = await agent.get('/api/v1/admin/tickets?search=search.author@bookleaf.test');

      expect(byNumber.body.data.items).toHaveLength(1);
      expect(bySubject.body.data.items).toHaveLength(1);
      expect(byAuthor.body.data.items).toHaveLength(2);
    });

    it('filters unassigned tickets using assignedTo=unassigned', async () => {
      const author = await createTestAuthor({
        email: 'unassigned.author@bookleaf.test',
        authorId: 'AUTH005',
      });
      const admin = await createTestAdmin({ email: 'admin.queue@bookleaf.test' });

      await createTestTicket(author._id, { ticketNumber: 'TKT-UA-1', assignedAdmin: null });
      await createTestTicket(author._id, {
        ticketNumber: 'TKT-UA-2',
        assignedAdmin: admin._id,
      });

      const { agent } = await loginAdmin();
      const response = await agent.get('/api/v1/admin/tickets?assignedTo=unassigned');

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].ticketNumber).toBe('TKT-UA-1');
    });
  });

  describe('PATCH /api/v1/admin/tickets/:ticketId/assignment', () => {
    it('assigns a ticket to another active admin and creates an audit entry', async () => {
      const author = await createTestAuthor({ email: 'assign.author@bookleaf.test', authorId: 'AUTH006' });
      const actingAdmin = await createTestAdmin({ email: 'admin.assigner@bookleaf.test' });
      const assignee = await createTestAdmin({
        email: 'admin.assignee@bookleaf.test',
        name: 'Assignee Admin',
      });
      const ticket = await createTestTicket(author._id, { ticketNumber: 'TKT-6001' });

      const { agent } = await loginDirect(app, {
        email: 'admin.assigner@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent
        .patch(`/api/v1/admin/tickets/${ticket._id.toString()}/assignment`)
        .send({ assignedTo: assignee._id.toString() });

      expect(response.status).toBe(200);
      expect(response.body.data.ticket.assignedAdmin).toMatchObject({
        id: assignee._id.toString(),
        email: 'admin.assignee@bookleaf.test',
      });

      const audit = await AuditLog.findOne({ ticket: ticket._id, action: 'TICKET_ASSIGNED' });
      expect(audit.oldValue).toBeNull();
      expect(audit.newValue).toBe(assignee._id.toString());
      expect(audit.actor.toString()).toBe(actingAdmin._id.toString());
    });

    it('rejects invalid, inactive, or non-admin assignees', async () => {
      const author = await createTestAuthor({ email: 'badassign.author@bookleaf.test', authorId: 'AUTH007' });
      await createTestAdmin({ email: 'admin.assigner@bookleaf.test' });
      const inactiveAdmin = await createTestAdmin({
        email: 'inactive.admin@bookleaf.test',
        isActive: false,
      });
      const ticket = await createTestTicket(author._id, { ticketNumber: 'TKT-6002' });

      const { agent } = await loginDirect(app, {
        email: 'admin.assigner@bookleaf.test',
        password: samplePassword,
      });

      const invalidId = await agent
        .patch(`/api/v1/admin/tickets/${ticket._id.toString()}/assignment`)
        .send({ assignedTo: '507f1f77bcf86cd799439011' });
      const inactive = await agent
        .patch(`/api/v1/admin/tickets/${ticket._id.toString()}/assignment`)
        .send({ assignedTo: inactiveAdmin._id.toString() });
      const authorAssignee = await agent
        .patch(`/api/v1/admin/tickets/${ticket._id.toString()}/assignment`)
        .send({
          assignedTo: (
            await createTestAuthor({ email: 'notadmin@bookleaf.test', authorId: 'AUTH008' })
          )._id.toString(),
        });

      expect(invalidId.status).toBe(400);
      expect(inactive.status).toBe(400);
      expect(authorAssignee.status).toBe(400);
    });

    it('allows unassignment and skips duplicate audit entries for no-op assignment', async () => {
      const author = await createTestAuthor({ email: 'unassign.author@bookleaf.test', authorId: 'AUTH009' });
      const admin = await createTestAdmin({ email: 'admin.unassign@bookleaf.test' });
      const ticket = await createTestTicket(author._id, {
        ticketNumber: 'TKT-6003',
        assignedAdmin: admin._id,
      });

      const { agent } = await loginDirect(app, {
        email: 'admin.unassign@bookleaf.test',
        password: samplePassword,
      });

      const unassign = await agent
        .patch(`/api/v1/admin/tickets/${ticket._id.toString()}/assignment`)
        .send({ assignedTo: null });

      expect(unassign.status).toBe(200);
      expect(unassign.body.data.ticket.assignedAdmin).toBeNull();

      const auditCountBefore = await AuditLog.countDocuments({ ticket: ticket._id });
      const noop = await agent
        .patch(`/api/v1/admin/tickets/${ticket._id.toString()}/assignment`)
        .send({ assignedTo: null });

      expect(noop.status).toBe(200);
      expect(await AuditLog.countDocuments({ ticket: ticket._id })).toBe(auditCountBefore);
    });
  });

  describe('PATCH /api/v1/admin/tickets/:ticketId/status', () => {
    it('applies valid status transitions and timestamps', async () => {
      const author = await createTestAuthor({ email: 'status.author@bookleaf.test', authorId: 'AUTH010' });
      await createTestAdmin({ email: 'admin.status@bookleaf.test' });
      const ticket = await createTestTicket(author._id, {
        ticketNumber: 'TKT-7001',
        status: TICKET_STATUSES.OPEN,
      });

      const { agent } = await loginDirect(app, {
        email: 'admin.status@bookleaf.test',
        password: samplePassword,
      });

      const resolved = await agent
        .patch(`/api/v1/admin/tickets/${ticket._id.toString()}/status`)
        .send({ status: TICKET_STATUSES.RESOLVED });

      expect(resolved.status).toBe(200);
      expect(resolved.body.data.ticket.resolvedAt).toBeTruthy();
      expect(resolved.body.data.ticket.status).toBe(TICKET_STATUSES.RESOLVED);

      const closed = await agent
        .patch(`/api/v1/admin/tickets/${ticket._id.toString()}/status`)
        .send({ status: TICKET_STATUSES.CLOSED });

      expect(closed.body.data.ticket.closedAt).toBeTruthy();
      expect(closed.body.data.ticket.status).toBe(TICKET_STATUSES.CLOSED);

      const audit = await AuditLog.find({ ticket: ticket._id, action: 'TICKET_STATUS_CHANGED' });
      expect(audit).toHaveLength(2);
    });

    it('rejects invalid transitions from closed tickets and no-op status updates', async () => {
      const author = await createTestAuthor({ email: 'closedstatus.author@bookleaf.test', authorId: 'AUTH011' });
      await createTestAdmin({ email: 'admin.status@bookleaf.test' });
      const ticket = await createTestTicket(author._id, {
        ticketNumber: 'TKT-7002',
        status: TICKET_STATUSES.CLOSED,
        closedAt: new Date(),
      });

      const { agent } = await loginDirect(app, {
        email: 'admin.status@bookleaf.test',
        password: samplePassword,
      });

      const invalid = await agent
        .patch(`/api/v1/admin/tickets/${ticket._id.toString()}/status`)
        .send({ status: TICKET_STATUSES.OPEN });

      expect(invalid.status).toBe(400);

      const auditCount = await AuditLog.countDocuments({ ticket: ticket._id });
      const noop = await agent
        .patch(`/api/v1/admin/tickets/${ticket._id.toString()}/status`)
        .send({ status: TICKET_STATUSES.CLOSED });

      expect(noop.status).toBe(200);
      expect(await AuditLog.countDocuments({ ticket: ticket._id })).toBe(auditCount);
    });

    it('clears resolvedAt when leaving the resolved state', async () => {
      const author = await createTestAuthor({ email: 'resolved.author@bookleaf.test', authorId: 'AUTH012' });
      await createTestAdmin({ email: 'admin.status@bookleaf.test' });
      const ticket = await createTestTicket(author._id, {
        ticketNumber: 'TKT-7003',
        status: TICKET_STATUSES.RESOLVED,
        resolvedAt: new Date(),
      });

      const { agent } = await loginDirect(app, {
        email: 'admin.status@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent
        .patch(`/api/v1/admin/tickets/${ticket._id.toString()}/status`)
        .send({ status: TICKET_STATUSES.IN_PROGRESS });

      expect(response.status).toBe(200);
      expect(response.body.data.ticket.resolvedAt).toBeNull();
    });
  });

  describe('PATCH /api/v1/admin/tickets/:ticketId/classification', () => {
    it('overrides category and priority independently while preserving AI fields', async () => {
      const author = await createTestAuthor({
        email: 'classify.author@bookleaf.test',
        authorId: 'AUTH013',
      });
      await createTestAdmin({ email: 'admin.classify@bookleaf.test' });
      const ticket = await createTestTicket(author._id, {
        ticketNumber: 'TKT-8001',
        aiCategory: TICKET_CATEGORIES.GENERAL_INQUIRY,
        aiPriority: TICKET_PRIORITIES.LOW,
        category: null,
        priority: null,
      });

      const { agent } = await loginDirect(app, {
        email: 'admin.classify@bookleaf.test',
        password: samplePassword,
      });

      const categoryOnly = await agent
        .patch(`/api/v1/admin/tickets/${ticket._id.toString()}/classification`)
        .send({ category: TICKET_CATEGORIES.ROYALTY_PAYMENTS });

      expect(categoryOnly.status).toBe(200);
      expect(categoryOnly.body.data.ticket.category).toBe(TICKET_CATEGORIES.ROYALTY_PAYMENTS);
      expect(categoryOnly.body.data.ticket.aiCategory).toBe(TICKET_CATEGORIES.GENERAL_INQUIRY);
      expect(categoryOnly.body.data.ticket.priority).toBeNull();

      const both = await agent
        .patch(`/api/v1/admin/tickets/${ticket._id.toString()}/classification`)
        .send({
          category: TICKET_CATEGORIES.ISBN_METADATA,
          priority: TICKET_PRIORITIES.CRITICAL,
        });

      expect(both.body.data.ticket.priority).toBe(TICKET_PRIORITIES.CRITICAL);
      expect(both.body.data.ticket.aiPriority).toBe(TICKET_PRIORITIES.LOW);

      const audits = await AuditLog.find({ ticket: ticket._id }).sort({ createdAt: 1, _id: 1 });
      expect(audits.map((entry) => entry.action)).toEqual([
        'TICKET_CATEGORY_CHANGED',
        'TICKET_CATEGORY_CHANGED',
        'TICKET_PRIORITY_CHANGED',
      ]);
    }, 15000);

    it('rejects empty classification requests and protected field mass assignment', async () => {
      const author = await createTestAuthor({
        email: 'protected.author@bookleaf.test',
        authorId: 'AUTH014',
      });
      await createTestAdmin({ email: 'admin.classify@bookleaf.test' });
      const ticket = await createTestTicket(author._id, { ticketNumber: 'TKT-8002' });

      const { agent } = await loginDirect(app, {
        email: 'admin.classify@bookleaf.test',
        password: samplePassword,
      });

      const empty = await agent
        .patch(`/api/v1/admin/tickets/${ticket._id.toString()}/classification`)
        .send({});
      const protectedFields = await agent
        .patch(`/api/v1/admin/tickets/${ticket._id.toString()}/classification`)
        .send({
          category: TICKET_CATEGORIES.GENERAL_INQUIRY,
          ticketNumber: 'TKT-HACKED',
          authorId: 'AUTH999',
        });

      expect(empty.status).toBe(400);
      expect(protectedFields.status).toBe(400);

      const stored = await Ticket.findById(ticket._id);
      expect(stored.ticketNumber).toBe('TKT-8002');
    });

    it('does not create duplicate audit entries for no-op classification changes', async () => {
      const author = await createTestAuthor({
        email: 'noopclass.author@bookleaf.test',
        authorId: 'AUTH015',
      });
      await createTestAdmin({ email: 'admin.classify@bookleaf.test' });
      const ticket = await createTestTicket(author._id, {
        ticketNumber: 'TKT-8003',
        category: TICKET_CATEGORIES.GENERAL_INQUIRY,
        priority: TICKET_PRIORITIES.MEDIUM,
      });

      const { agent } = await loginDirect(app, {
        email: 'admin.classify@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent
        .patch(`/api/v1/admin/tickets/${ticket._id.toString()}/classification`)
        .send({
          category: TICKET_CATEGORIES.GENERAL_INQUIRY,
          priority: TICKET_PRIORITIES.MEDIUM,
        });

      expect(response.status).toBe(200);
      expect(await AuditLog.countDocuments({ ticket: ticket._id })).toBe(0);
    });
  });

  describe('error handling and missing tickets', () => {
    it('returns not found for missing tickets', async () => {
      await createTestAdmin({ email: 'admin.missing@bookleaf.test' });
      const { agent } = await loginDirect(app, {
        email: 'admin.missing@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent
        .patch('/api/v1/admin/tickets/507f1f77bcf86cd799439011/status')
        .send({ status: TICKET_STATUSES.IN_PROGRESS });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Ticket not found');
    });

    it('reverts ticket changes when audit persistence fails', async () => {
      const author = await createTestAuthor({
        email: 'auditfail.author@bookleaf.test',
        authorId: 'AUTH016',
      });
      await createTestAdmin({ email: 'admin.auditfail@bookleaf.test' });
      const ticket = await createTestTicket(author._id, {
        ticketNumber: 'TKT-9001',
        status: TICKET_STATUSES.OPEN,
        category: null,
      });

      const auditSpy = jest
        .spyOn(AuditLog, 'create')
        .mockRejectedValueOnce(new Error('audit write failed'));

      const { agent } = await loginDirect(app, {
        email: 'admin.auditfail@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent
        .patch(`/api/v1/admin/tickets/${ticket._id.toString()}/classification`)
        .send({ category: TICKET_CATEGORIES.GENERAL_INQUIRY });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to record administrative audit log');

      const stored = await Ticket.findById(ticket._id);
      expect(stored.category).toBeNull();

      auditSpy.mockRestore();
    });
  });
});
