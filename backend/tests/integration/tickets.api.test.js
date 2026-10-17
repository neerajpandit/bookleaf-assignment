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
import {
  createTestInternalNote,
  createTestTicket,
  createTestTicketMessage,
} from '../helpers/ticketHelper.js';
import Ticket from '../../src/modules/tickets/ticket.model.js';
import TicketMessage from '../../src/modules/tickets/ticketMessage.model.js';
import AuditLog from '../../src/modules/audit-logs/auditLog.model.js';
import { TICKET_STATUSES } from '../../src/constants/ticketStatus.js';
import { TICKET_CATEGORIES } from '../../src/constants/ticketCategory.js';
import { TICKET_PRIORITIES } from '../../src/constants/ticketPriority.js';
import { ROLES } from '../../src/constants/roles.js';
import { createAuthorTicket } from '../../src/modules/tickets/ticket.service.js';
import { generateTicketNumber } from '../../src/modules/tickets/ticketNumber.service.js';

describe('Tickets API', () => {
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

  describe('POST /api/v1/tickets', () => {
    it('creates a book-specific ticket for the authenticated author', async () => {
      const author = await createTestAuthor({
        email: 'author.tickets@bookleaf.test',
        authorId: 'AUTH001',
        name: 'Ticket Author',
      });
      await createTestBook(author._id, { bookId: 'BK001' });

      const { agent } = await loginDirect(app, {
        email: 'author.tickets@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.post('/api/v1/tickets').send({
        subject: 'Royalty payout question',
        description: 'I have not received my latest royalty payout.',
        bookId: 'BK001',
      });

      expect(response.status).toBe(201);
      expect(response.body.data.ticket.ticketNumber).toMatch(/^TKT-100\d+$/);
      expect(response.body.data.ticket.subject).toBe('Royalty payout question');
      expect(response.body.data.ticket.book).toEqual({
        bookId: 'BK001',
        title: 'Whispers of the Ganges',
      });
      expect(response.body.data.ticket.status).toBe(TICKET_STATUSES.OPEN);
      expect(response.body.data.initialMessage.body).toBe(
        'I have not received my latest royalty payout.',
      );
      expect(JSON.stringify(response.body)).not.toMatch(/aiError|passwordHash|aiDraftResponse/);

      const auditEntry = await AuditLog.findOne({ action: 'TICKET_CREATED' });
      expect(auditEntry).toBeTruthy();
    });

    it('creates a general account-level ticket without a book reference', async () => {
      await createTestAuthor({
        email: 'general.author@bookleaf.test',
        authorId: 'AUTH003',
      });

      const { agent } = await loginDirect(app, {
        email: 'general.author@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.post('/api/v1/tickets').send({
        subject: 'Update my contact details',
        description: 'Please update my phone number on file.',
        categoryContext: 'GENERAL_ACCOUNT',
      });

      expect(response.status).toBe(201);
      expect(response.body.data.ticket.book).toBeNull();

      const stored = await Ticket.findOne({ ticketNumber: response.body.data.ticket.ticketNumber });
      expect(stored.book).toBeNull();
    });

    it('rejects missing subject or description', async () => {
      await createTestAuthor({
        email: 'invalid.author@bookleaf.test',
        authorId: 'AUTH004',
      });

      const { agent } = await loginDirect(app, {
        email: 'invalid.author@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.post('/api/v1/tickets').send({
        subject: '',
        description: '   ',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('rejects attaching another author book to a ticket', async () => {
      const author = await createTestAuthor({
        email: 'owner.author@bookleaf.test',
        authorId: 'AUTH005',
      });
      const otherAuthor = await createTestAuthor({
        email: 'other.owner@bookleaf.test',
        authorId: 'AUTH006',
      });
      await createTestBook(otherAuthor._id, { bookId: 'BK010', title: 'Other Book' });

      const { agent } = await loginDirect(app, {
        email: 'owner.author@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.post('/api/v1/tickets').send({
        subject: 'Book issue',
        description: 'Need help with my book.',
        bookId: 'BK010',
      });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Book not found');
    });

    it('rejects general account tickets that reference a book', async () => {
      const author = await createTestAuthor({
        email: 'conflict.author@bookleaf.test',
        authorId: 'AUTH007',
      });
      await createTestBook(author._id, { bookId: 'BK001' });

      const { agent } = await loginDirect(app, {
        email: 'conflict.author@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.post('/api/v1/tickets').send({
        subject: 'Conflicting ticket',
        description: 'This should fail validation.',
        categoryContext: 'GENERAL_ACCOUNT',
        bookId: 'BK001',
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
    });

    it('rejects unauthenticated requests', async () => {
      const response = await request(app).post('/api/v1/tickets').send({
        subject: 'No auth',
        description: 'Should fail',
      });

      expect(response.status).toBe(401);
    });

    it('rejects admin accounts on author-only ticket endpoints', async () => {
      await createTestAdmin({ email: 'admin.tickets@bookleaf.test' });

      const { agent } = await loginDirect(app, {
        email: 'admin.tickets@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.post('/api/v1/tickets').send({
        subject: 'Admin attempt',
        description: 'Should be forbidden',
      });

      expect(response.status).toBe(403);
    });
  });

  describe('ticket number generation', () => {
    it('generates unique ticket numbers under concurrent creation', async () => {
      const author = await createTestAuthor({
        email: 'concurrent.author@bookleaf.test',
        authorId: 'AUTH008',
      });

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          createAuthorTicket(author._id, {
            subject: 'Concurrent ticket',
            description: 'Created concurrently',
            categoryContext: 'GENERAL_ACCOUNT',
          }),
        ),
      );

      const numbers = results.map((result) => result.ticket.ticketNumber).sort();
      expect(numbers).toEqual(['TKT-1001', 'TKT-1002', 'TKT-1003', 'TKT-1004', 'TKT-1005']);
    });

    it('uses atomic counter increments without duplicates', async () => {
      const numbers = await Promise.all(Array.from({ length: 3 }, () => generateTicketNumber()));
      expect(new Set(numbers).size).toBe(3);
    });
  });

  describe('GET /api/v1/tickets', () => {
    it('returns only the authenticated author tickets with pagination metadata', async () => {
      const author = await createTestAuthor({
        email: 'list.author@bookleaf.test',
        authorId: 'AUTH009',
      });
      const otherAuthor = await createTestAuthor({
        email: 'list.other@bookleaf.test',
        authorId: 'AUTH010',
      });

      await createTestTicket(author._id, { ticketNumber: 'TKT-8001', subject: 'Mine 1' });
      await createTestTicket(author._id, { ticketNumber: 'TKT-8002', subject: 'Mine 2' });
      await createTestTicket(otherAuthor._id, { ticketNumber: 'TKT-8003', subject: 'Not mine' });

      const { agent } = await loginDirect(app, {
        email: 'list.author@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get('/api/v1/tickets?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
      expect(response.body.data.items.every((ticket) => ticket.subject.startsWith('Mine'))).toBe(true);
    });

    it('filters tickets by status, category, and search for the authenticated author only', async () => {
      const author = await createTestAuthor({
        email: 'filter.author@bookleaf.test',
        authorId: 'AUTH011A',
      });
      const otherAuthor = await createTestAuthor({
        email: 'filter.other@bookleaf.test',
        authorId: 'AUTH011B',
      });

      await createTestTicket(author._id, {
        ticketNumber: 'TKT-8101',
        subject: 'Open royalty issue',
        status: TICKET_STATUSES.OPEN,
        category: TICKET_CATEGORIES.ROYALTY_PAYMENTS,
        priority: TICKET_PRIORITIES.HIGH,
      });
      await createTestTicket(author._id, {
        ticketNumber: 'TKT-8102',
        subject: 'Closed general inquiry',
        status: TICKET_STATUSES.CLOSED,
        category: TICKET_CATEGORIES.GENERAL_INQUIRY,
      });
      await createTestTicket(otherAuthor._id, {
        ticketNumber: 'TKT-8103',
        subject: 'Open royalty issue',
        status: TICKET_STATUSES.OPEN,
        category: TICKET_CATEGORIES.ROYALTY_PAYMENTS,
      });

      const { agent } = await loginDirect(app, {
        email: 'filter.author@bookleaf.test',
        password: samplePassword,
      });

      const byStatus = await agent.get(`/api/v1/tickets?status=${TICKET_STATUSES.OPEN}`);
      const byCategory = await agent.get(
        `/api/v1/tickets?category=${encodeURIComponent(TICKET_CATEGORIES.ROYALTY_PAYMENTS)}`,
      );
      const bySearch = await agent.get('/api/v1/tickets?search=8101');

      expect(byStatus.body.data.items).toHaveLength(1);
      expect(byStatus.body.data.items[0].ticketNumber).toBe('TKT-8101');
      expect(byCategory.body.data.items).toHaveLength(1);
      expect(bySearch.body.data.items).toHaveLength(1);
    });

    it('rejects invalid author ticket filter values', async () => {
      await createTestAuthor({
        email: 'invalid-filter.author@bookleaf.test',
        authorId: 'AUTH011C',
      });

      const { agent } = await loginDirect(app, {
        email: 'invalid-filter.author@bookleaf.test',
        password: samplePassword,
      });

      const invalidStatus = await agent.get('/api/v1/tickets?status=OPENED');
      const invalidCategory = await agent.get('/api/v1/tickets?category=Payments');

      expect(invalidStatus.status).toBe(400);
      expect(invalidCategory.status).toBe(400);
    });

    it('validates invalid pagination values and enforces the maximum limit', async () => {
      await createTestAuthor({
        email: 'pagination.author@bookleaf.test',
        authorId: 'AUTH011',
      });

      const { agent } = await loginDirect(app, {
        email: 'pagination.author@bookleaf.test',
        password: samplePassword,
      });

      const invalidPage = await agent.get('/api/v1/tickets?page=0');
      const invalidLimit = await agent.get('/api/v1/tickets?limit=100');

      expect(invalidPage.status).toBe(400);
      expect(invalidLimit.status).toBe(400);
    });
  });

  describe('GET /api/v1/tickets/:ticketId', () => {
    it('returns ticket details with public messages but no internal notes', async () => {
      const author = await createTestAuthor({
        email: 'detail.author@bookleaf.test',
        authorId: 'AUTH012',
        name: 'Detail Author',
      });
      const admin = await createTestAdmin({ email: 'detail.admin@bookleaf.test' });
      const ticket = await createTestTicket(author._id, {
        ticketNumber: 'TKT-7001',
        aiError: 'hidden ai failure',
        aiDraftResponse: 'hidden draft',
      });
      await createTestTicketMessage(ticket._id, author._id, { body: 'First public message' });
      await createTestInternalNote(ticket._id, admin._id, { body: 'Private admin note' });

      const { agent } = await loginDirect(app, {
        email: 'detail.author@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get(`/api/v1/tickets/${ticket._id.toString()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.ticket.messages).toHaveLength(1);
      expect(response.body.data.ticket.messages[0].body).toBe('First public message');
      expect(JSON.stringify(response.body)).not.toContain('Private admin note');
      expect(JSON.stringify(response.body)).not.toMatch(/aiError|aiDraftResponse|passwordHash/);
    });

    it('returns not found for another author ticket', async () => {
      const author = await createTestAuthor({
        email: 'owner.detail@bookleaf.test',
        authorId: 'AUTH013',
      });
      const otherAuthor = await createTestAuthor({
        email: 'other.detail@bookleaf.test',
        authorId: 'AUTH014',
      });
      const foreignTicket = await createTestTicket(otherAuthor._id, { ticketNumber: 'TKT-7002' });

      const { agent } = await loginDirect(app, {
        email: 'owner.detail@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get(`/api/v1/tickets/${foreignTicket._id.toString()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Ticket not found');
    });
  });

  describe('POST /api/v1/tickets/:ticketId/messages', () => {
    it('allows an author to add a follow-up message and updates lastMessageAt', async () => {
      const author = await createTestAuthor({
        email: 'message.author@bookleaf.test',
        authorId: 'AUTH015',
        name: 'Message Author',
      });
      const ticket = await createTestTicket(author._id, {
        ticketNumber: 'TKT-6001',
        lastMessageAt: new Date('2024-01-01T00:00:00.000Z'),
      });

      const { agent } = await loginDirect(app, {
        email: 'message.author@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.post(`/api/v1/tickets/${ticket._id.toString()}/messages`).send({
        body: 'Following up on my ticket.',
      });

      expect(response.status).toBe(201);
      expect(response.body.data.message.body).toBe('Following up on my ticket.');
      expect(response.body.data.message.senderRole).toBe(ROLES.AUTHOR);

      const updatedTicket = await Ticket.findById(ticket._id);
      expect(updatedTicket.lastMessageAt.getTime()).toBeGreaterThan(
        new Date('2024-01-01T00:00:00.000Z').getTime(),
      );
    });

    it('allows follow-up messages on resolved tickets without reopening them', async () => {
      const author = await createTestAuthor({
        email: 'resolved.author@bookleaf.test',
        authorId: 'AUTH016',
      });
      const ticket = await createTestTicket(author._id, {
        ticketNumber: 'TKT-6002',
        status: TICKET_STATUSES.RESOLVED,
      });

      const { agent } = await loginDirect(app, {
        email: 'resolved.author@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.post(`/api/v1/tickets/${ticket._id.toString()}/messages`).send({
        body: 'Thanks, one more question though.',
      });

      expect(response.status).toBe(201);

      const updatedTicket = await Ticket.findById(ticket._id);
      expect(updatedTicket.status).toBe(TICKET_STATUSES.RESOLVED);
    });

    it('rejects messages on closed tickets', async () => {
      const author = await createTestAuthor({
        email: 'closed.author@bookleaf.test',
        authorId: 'AUTH017',
      });
      const ticket = await createTestTicket(author._id, {
        ticketNumber: 'TKT-6003',
        status: TICKET_STATUSES.CLOSED,
      });

      const { agent } = await loginDirect(app, {
        email: 'closed.author@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.post(`/api/v1/tickets/${ticket._id.toString()}/messages`).send({
        body: 'Trying to reopen',
      });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Cannot add messages to a closed ticket');
    });

    it('rejects spoofed sender identity fields in the request body', async () => {
      const author = await createTestAuthor({
        email: 'spoof.author@bookleaf.test',
        authorId: 'AUTH018',
      });
      const admin = await createTestAdmin({ email: 'spoof.admin@bookleaf.test' });
      const ticket = await createTestTicket(author._id, { ticketNumber: 'TKT-6004' });

      const { agent } = await loginDirect(app, {
        email: 'spoof.author@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.post(`/api/v1/tickets/${ticket._id.toString()}/messages`).send({
        body: 'Attempted spoof',
        senderId: admin._id.toString(),
        senderRole: ROLES.ADMIN,
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');

      const messages = await TicketMessage.find({ ticket: ticket._id });
      expect(messages).toHaveLength(0);
    });

    it('returns a standard error response for unexpected database failures', async () => {
      const author = await createTestAuthor({
        email: 'dbfail.author@bookleaf.test',
        authorId: 'AUTH019',
      });
      await createTestBook(author._id, { bookId: 'BK001' });

      const createSpy = jest.spyOn(Ticket, 'create').mockRejectedValueOnce(new Error('Database unavailable'));

      const { agent } = await loginDirect(app, {
        email: 'dbfail.author@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.post('/api/v1/tickets').send({
        subject: 'Failure case',
        description: 'Trigger database failure',
        bookId: 'BK001',
      });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Internal server error',
      });
      expect(JSON.stringify(response.body)).not.toContain('Database unavailable');

      createSpy.mockRestore();
    });
  });
});
