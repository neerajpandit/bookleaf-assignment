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
import { createTestTicket } from '../helpers/ticketHelper.js';
import Ticket from '../../src/modules/tickets/ticket.model.js';
import AuditLog from '../../src/modules/audit-logs/auditLog.model.js';
import { TICKET_PRIORITIES } from '../../src/constants/ticketPriority.js';
import { TICKET_CATEGORIES } from '../../src/constants/ticketCategory.js';
import { AUDIT_ACTIONS } from '../../src/constants/auditActions.js';
import { SUGGESTION_SOURCES } from '../../src/constants/suggestionSource.js';
import { applyPolicySuggestionToTicket } from '../../src/modules/tickets/ticketPolicyClassification.service.js';

describe('Ticket priority policy and overrides API', () => {
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

  it('applies deterministic policy suggestion when a ticket is created', async () => {
    const author = await createTestAuthor({
      email: 'policy.author@bookleaf.test',
      authorId: 'AUTHP01',
    });
    await createTestBook(author._id, { bookId: 'BK001' });

    const { agent } = await loginDirect(app, {
      email: 'policy.author@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent.post('/api/v1/tickets').send({
      subject: 'Royalty payout timing',
      description: 'When will my quarterly royalty payout be processed?',
      bookId: 'BK001',
    });

    expect(response.status).toBe(201);
    expect(response.body.data.ticket.priority).toBe(TICKET_PRIORITIES.LOW);

    const stored = await Ticket.findOne({ ticketNumber: response.body.data.ticket.ticketNumber });
    expect(stored.policyPriority).toBe(TICKET_PRIORITIES.LOW);
    expect(stored.priority).toBe(TICKET_PRIORITIES.LOW);
    expect(stored.suggestionSource).toBe(SUGGESTION_SOURCES.POLICY_RULES);
    expect(stored.priorityOverride).toBe(false);
    expect(stored.policyPriorityRationale).toBeTruthy();
  });

  it('persists admin priority override without changing the original suggestion', async () => {
    const author = await createTestAuthor({
      email: 'override.author@bookleaf.test',
      authorId: 'AUTHP02',
    });
    const admin = await createTestAdmin({ email: 'admin.policy@bookleaf.test' });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-P100',
      policyCategory: TICKET_CATEGORIES.ROYALTY_PAYMENTS,
      policyPriority: TICKET_PRIORITIES.LOW,
      category: TICKET_CATEGORIES.ROYALTY_PAYMENTS,
      priority: TICKET_PRIORITIES.LOW,
      suggestionSource: SUGGESTION_SOURCES.POLICY_RULES,
    });

    const { agent } = await loginDirect(app, {
      email: 'admin.policy@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent
      .patch(`/api/v1/admin/tickets/${ticket._id.toString()}/classification`)
      .send({
        priority: TICKET_PRIORITIES.CRITICAL,
        priorityOverrideReason: 'Confirmed payout disruption after manual review',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.ticket.priority).toBe(TICKET_PRIORITIES.CRITICAL);
    expect(response.body.data.ticket.policyPriority).toBe(TICKET_PRIORITIES.LOW);
    expect(response.body.data.ticket.priorityOverride).toBe(true);

    const stored = await Ticket.findById(ticket._id);
    expect(stored.policyPriority).toBe(TICKET_PRIORITIES.LOW);
    expect(stored.priorityOverriddenBy?.toString()).toBe(admin._id.toString());

    const audit = await AuditLog.findOne({
      ticket: ticket._id,
      action: AUDIT_ACTIONS.TICKET_PRIORITY_CHANGED,
    });
    expect(audit.metadata.suggestedPriority).toBeNull();
  });

  it('rejects author attempts to override priority', async () => {
    const author = await createTestAuthor({
      email: 'author.override@bookleaf.test',
      authorId: 'AUTHP03',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-P101',
      policyPriority: TICKET_PRIORITIES.LOW,
      priority: TICKET_PRIORITIES.LOW,
    });

    const { agent } = await loginDirect(app, {
      email: 'author.override@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent
      .patch(`/api/v1/admin/tickets/${ticket._id.toString()}/classification`)
      .send({ priority: TICKET_PRIORITIES.HIGH });

    expect(response.status).toBe(403);
  });

  it('rejects invalid priority values', async () => {
    await createTestAdmin({ email: 'admin.policy@bookleaf.test' });
    const author = await createTestAuthor({
      email: 'invalid.priority@bookleaf.test',
      authorId: 'AUTHP04',
    });
    const ticket = await createTestTicket(author._id, { ticketNumber: 'TKT-P102' });

    const { agent } = await loginDirect(app, {
      email: 'admin.policy@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent
      .patch(`/api/v1/admin/tickets/${ticket._id.toString()}/classification`)
      .send({ priority: 'URGENT' });

    expect(response.status).toBe(400);
  });

  it('does not replace effective priority when policy is reapplied under an active override', async () => {
    const author = await createTestAuthor({
      email: 'reclass.author@bookleaf.test',
      authorId: 'AUTHP05',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-P103',
      subject: 'Royalty payout timing',
      description: 'When will my quarterly royalty payout be processed?',
      policyPriority: TICKET_PRIORITIES.LOW,
      priority: TICKET_PRIORITIES.CRITICAL,
      priorityOverride: true,
    });

    await applyPolicySuggestionToTicket(ticket._id, { actorId: author._id });

    const stored = await Ticket.findById(ticket._id);
    expect(stored.priority).toBe(TICKET_PRIORITIES.CRITICAL);
    expect(stored.policyPriority).toBe(TICKET_PRIORITIES.LOW);
    expect(stored.priorityOverride).toBe(true);
  });

  it('clears an override and restores the policy priority', async () => {
    await createTestAdmin({ email: 'admin.policy@bookleaf.test' });
    const author = await createTestAuthor({
      email: 'clear.override@bookleaf.test',
      authorId: 'AUTHP06',
    });
    const ticket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-P104',
      policyPriority: TICKET_PRIORITIES.LOW,
      aiPriority: TICKET_PRIORITIES.MEDIUM,
      priority: TICKET_PRIORITIES.CRITICAL,
      priorityOverride: true,
      priorityOverrideReason: 'Temporary escalation',
    });

    const { agent } = await loginDirect(app, {
      email: 'admin.policy@bookleaf.test',
      password: samplePassword,
    });

    const response = await agent
      .patch(`/api/v1/admin/tickets/${ticket._id.toString()}/classification`)
      .send({ clearPriorityOverride: true });

    expect(response.status).toBe(200);
    expect(response.body.data.ticket.priority).toBe(TICKET_PRIORITIES.LOW);
    expect(response.body.data.ticket.priorityOverride).toBe(false);

    const audit = await AuditLog.findOne({
      ticket: ticket._id,
      action: AUDIT_ACTIONS.TICKET_PRIORITY_OVERRIDE_CLEARED,
    });
    expect(audit).toBeTruthy();
  });

  it('uses effective priority for admin queue filtering and dashboard urgent sections', async () => {
    await createTestAdmin({ email: 'admin.policy@bookleaf.test' });
    const author = await createTestAuthor({
      email: 'queue.priority@bookleaf.test',
      authorId: 'AUTHP07',
    });

    await createTestTicket(author._id, {
      ticketNumber: 'TKT-P105',
      status: 'OPEN',
      policyPriority: TICKET_PRIORITIES.LOW,
      priority: TICKET_PRIORITIES.CRITICAL,
      priorityOverride: true,
    });
    await createTestTicket(author._id, {
      ticketNumber: 'TKT-P106',
      status: 'OPEN',
      policyPriority: TICKET_PRIORITIES.HIGH,
      priority: TICKET_PRIORITIES.HIGH,
      priorityOverride: false,
    });

    const { agent } = await loginDirect(app, {
      email: 'admin.policy@bookleaf.test',
      password: samplePassword,
    });

    const queue = await agent.get('/api/v1/admin/tickets?priority=CRITICAL');
    expect(queue.body.data.items).toHaveLength(1);
    expect(queue.body.data.items[0].ticketNumber).toBe('TKT-P105');

    const dashboard = await agent.get('/api/v1/admin/dashboard/ticket-sections?limit=5');
    expect(
      dashboard.body.data.urgent.some((item) => item.ticketNumber === 'TKT-P105'),
    ).toBe(true);
  });
});
