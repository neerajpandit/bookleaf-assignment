import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
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
} from '../helpers/ticketHelper.js';
import Ticket from '../../src/modules/tickets/ticket.model.js';
import TicketMessage from '../../src/modules/tickets/ticketMessage.model.js';
import { ROLES } from '../../src/constants/roles.js';
import { AI_PROCESSING_STATUSES } from '../../src/constants/aiProcessingStatus.js';

describe('Cross-portal messaging lifecycle', () => {
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

  it('author message → admin sees → admin reply → author sees persisted messages', async () => {
    await createTestAdmin({ email: 'lifecycle.admin@bookleaf.test' });
    const author = await createTestAuthor({
      email: 'lifecycle.author@bookleaf.test',
      authorId: 'AUTH201',
      name: 'Lifecycle Author',
    });
    await createTestBook(author._id, { bookId: 'BK201' });

    const { agent: authorAgent } = await loginDirect(app, {
      email: 'lifecycle.author@bookleaf.test',
      password: samplePassword,
    });
    const { agent: adminAgent } = await loginDirect(app, {
      email: 'lifecycle.admin@bookleaf.test',
      password: samplePassword,
    });

    const createResponse = await authorAgent.post('/api/v1/tickets').send({
      subject: 'Royalty timing question',
      description: 'When will my pending royalties be processed?',
      bookId: 'BK201',
    });

    expect(createResponse.status).toBe(201);
    const ticketId = createResponse.body.data.ticket.id;

    const authorMessageResponse = await authorAgent
      .post(`/api/v1/tickets/${ticketId}/messages`)
      .send({ body: 'Following up on my payout timeline.' });

    expect(authorMessageResponse.status).toBe(201);
    expect(authorMessageResponse.body.data.message.senderRole).toBe(ROLES.AUTHOR);

    const adminMessagesBeforeReply = await adminAgent.get(
      `/api/v1/admin/tickets/${ticketId}/messages`,
    );

    expect(adminMessagesBeforeReply.status).toBe(200);
    expect(
      adminMessagesBeforeReply.body.data.items.some(
        (item) => item.body === 'Following up on my payout timeline.',
      ),
    ).toBe(true);

    const adminReplyResponse = await adminAgent
      .post(`/api/v1/admin/tickets/${ticketId}/messages`)
      .send({ body: 'We are reviewing your payout schedule.' });

    expect(adminReplyResponse.status).toBe(201);
    expect(adminReplyResponse.body.data.message.senderRole).toBe(ROLES.ADMIN);

    const authorDetailAfterReply = await authorAgent.get(`/api/v1/tickets/${ticketId}`);
    expect(authorDetailAfterReply.status).toBe(200);
    expect(
      authorDetailAfterReply.body.data.ticket.messages.some(
        (message) => message.body === 'We are reviewing your payout schedule.',
      ),
    ).toBe(true);

    const authorDetailReload = await authorAgent.get(`/api/v1/tickets/${ticketId}`);
    expect(authorDetailReload.body.data.ticket.messages).toHaveLength(3);
    expect(
      authorDetailReload.body.data.ticket.messages.map((message) => message.body),
    ).toEqual([
      'When will my pending royalties be processed?',
      'Following up on my payout timeline.',
      'We are reviewing your payout schedule.',
    ]);
  });

  it('invalidates AI draft when author sends follow-up after analysis', async () => {
    const author = await createTestAuthor({
      email: 'stale.author@bookleaf.test',
      authorId: 'AUTH202',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-9201',
      aiDraftResponse: 'Suggested admin reply',
      aiProcessedAt: new Date('2024-06-01T00:00:00.000Z'),
      aiProcessingStatus: AI_PROCESSING_STATUSES.COMPLETED,
      aiNeedsHumanReview: false,
    });

    const { agent } = await loginDirect(app, {
      email: 'stale.author@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent
      .post(`/api/v1/tickets/${ticket._id.toString()}/messages`)
      .send({ body: 'I have another question about timing.' });

    expect(response.status).toBe(201);

    const refreshed = await Ticket.findById(ticket._id);
    expect(refreshed.aiDraftResponse).toBeNull();
    expect(refreshed.aiNeedsHumanReview).toBe(true);
    expect(refreshed.aiProcessingStatus).toBe(AI_PROCESSING_STATUSES.COMPLETED);
  });

  it('invalidates AI draft when admin sends public reply after analysis', async () => {
    await createTestAdmin({ email: 'stale.admin@bookleaf.test' });
    const author = await createTestAuthor({
      email: 'stale2.author@bookleaf.test',
      authorId: 'AUTH203',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-9202',
      aiDraftResponse: 'Outdated draft text',
      aiProcessedAt: new Date('2024-06-01T00:00:00.000Z'),
      aiProcessingStatus: AI_PROCESSING_STATUSES.COMPLETED,
      aiNeedsHumanReview: false,
    });

    const { agent } = await loginDirect(app, {
      email: 'stale.admin@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent
      .post(`/api/v1/admin/tickets/${ticket._id.toString()}/messages`)
      .send({ body: 'Manual public reply from admin.' });

    expect(response.status).toBe(201);

    const refreshed = await Ticket.findById(ticket._id);
    expect(refreshed.aiDraftResponse).toBeNull();
    expect(refreshed.aiNeedsHumanReview).toBe(true);
  });

  it('does not invalidate AI draft when admin adds internal note only', async () => {
    await createTestAdmin({ email: 'noteonly.admin@bookleaf.test' });
    const author = await createTestAuthor({
      email: 'noteonly.author@bookleaf.test',
      authorId: 'AUTH204',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-9203',
      aiDraftResponse: 'Keep this draft',
      aiProcessedAt: new Date('2024-06-01T00:00:00.000Z'),
      aiProcessingStatus: AI_PROCESSING_STATUSES.COMPLETED,
      aiNeedsHumanReview: false,
    });

    const { agent } = await loginDirect(app, {
      email: 'noteonly.admin@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent
      .post(`/api/v1/admin/tickets/${ticket._id.toString()}/notes`)
      .send({ body: 'Internal escalation note only.' });

    expect(response.status).toBe(201);

    const refreshed = await Ticket.findById(ticket._id);
    expect(refreshed.aiDraftResponse).toBe('Keep this draft');
    expect(refreshed.aiNeedsHumanReview).toBe(false);
  });

  it('blocks author access to another author ticket messages', async () => {
    const owner = await createTestAuthor({
      email: 'owner.author@bookleaf.test',
      authorId: 'AUTH205',
    });
    const otherAuthor = await createTestAuthor({
      email: 'other.author@bookleaf.test',
      authorId: 'AUTH206',
    });
    const ticket = await createTestTicket(owner._id, { ticketNumber: 'TKT-9204' });

    await TicketMessage.create({
      ticket: ticket._id,
      sender: owner._id,
      senderRole: ROLES.AUTHOR,
      body: 'Owner-only message',
    });

    const { agent } = await loginDirect(app, {
      email: 'other.author@bookleaf.test',
      password: samplePassword,
    });

    const detailResponse = await agent.get(`/api/v1/tickets/${ticket._id.toString()}`);
    const messageResponse = await agent
      .post(`/api/v1/tickets/${ticket._id.toString()}/messages`)
      .send({ body: 'Trying to access foreign ticket' });

    expect(detailResponse.status).toBe(404);
    expect(messageResponse.status).toBe(404);
  });

  it('keeps private notes out of author polling responses', async () => {
    const admin = await createTestAdmin({ email: 'privacy.admin@bookleaf.test' });
    const author = await createTestAuthor({
      email: 'privacy.author@bookleaf.test',
      authorId: 'AUTH207',
    });
    const ticket = await createTestTicket(author._id, { ticketNumber: 'TKT-9205' });

    await createTestInternalNote(ticket._id, admin._id, {
      body: 'Secret internal escalation note',
    });

    const { agent: authorAgent } = await loginDirect(app, {
      email: 'privacy.author@bookleaf.test',
      password: samplePassword,
    });

    const firstPoll = await authorAgent.get(`/api/v1/tickets/${ticket._id.toString()}`);
    const secondPoll = await authorAgent.get(`/api/v1/tickets/${ticket._id.toString()}`);

    expect(firstPoll.status).toBe(200);
    expect(secondPoll.status).toBe(200);
    expect(JSON.stringify(firstPoll.body)).not.toContain('Secret internal escalation note');
    expect(JSON.stringify(secondPoll.body)).not.toContain('Secret internal escalation note');
  });
});
