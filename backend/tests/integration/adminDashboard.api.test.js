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
import { createTestTicket } from '../helpers/ticketHelper.js';
import { TICKET_STATUSES } from '../../src/constants/ticketStatus.js';
import { TICKET_PRIORITIES } from '../../src/constants/ticketPriority.js';

describe('Admin Dashboard API', () => {
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

  const loginAdmin = () =>
    loginDirect(app, { email: 'admin.dashboard@bookleaf.test', password: samplePassword });

  it('returns globally oldest unresolved tickets regardless of queue page order', async () => {
    const author = await createTestAuthor({
      email: 'dashboard.author@bookleaf.test',
      authorId: 'AUTH900',
    });
    await createTestAdmin({ email: 'admin.dashboard@bookleaf.test' });

    const oldest = await createTestTicket(author._id, {
      ticketNumber: 'TKT-9001',
      subject: 'Truly oldest ticket',
      status: TICKET_STATUSES.OPEN,
      createdAt: new Date('2024-01-01T08:00:00.000Z'),
      lastMessageAt: new Date('2024-01-01T08:00:00.000Z'),
    });

    for (let index = 0; index < 12; index += 1) {
      await createTestTicket(author._id, {
        ticketNumber: `TKT-90${String(10 + index).padStart(2, '0')}`,
        subject: `Recent activity ticket ${index}`,
        status: TICKET_STATUSES.OPEN,
        createdAt: new Date(`2025-06-${String(index + 1).padStart(2, '0')}T10:00:00.000Z`),
        lastMessageAt: new Date(`2025-10-${String(index + 1).padStart(2, '0')}T10:00:00.000Z`),
      });
    }

    const { agent } = await loginAdmin();
    const response = await agent.get('/api/v1/admin/dashboard/ticket-sections?limit=5');

    expect(response.status).toBe(200);
    expect(response.body.data.oldestUnresolved[0].ticketNumber).toBe(oldest.ticketNumber);
    expect(response.body.data.oldestUnresolved[0].subject).toBe('Truly oldest ticket');
  });

  it('returns globally urgent tickets even when they are outside the first queue page', async () => {
    const author = await createTestAuthor({
      email: 'urgent.dashboard@bookleaf.test',
      authorId: 'AUTH901',
    });
    await createTestAdmin({ email: 'admin.dashboard@bookleaf.test' });

    const staleCritical = await createTestTicket(author._id, {
      ticketNumber: 'TKT-9100',
      subject: 'Stale critical payout issue',
      status: TICKET_STATUSES.OPEN,
      priority: TICKET_PRIORITIES.CRITICAL,
      createdAt: new Date('2024-02-01T08:00:00.000Z'),
      lastMessageAt: new Date('2024-02-01T08:00:00.000Z'),
    });

    for (let index = 0; index < 12; index += 1) {
      await createTestTicket(author._id, {
        ticketNumber: `TKT-91${String(10 + index).padStart(2, '0')}`,
        subject: `Recent high ticket ${index}`,
        status: TICKET_STATUSES.OPEN,
        priority: TICKET_PRIORITIES.HIGH,
        createdAt: new Date(`2025-07-${String(index + 1).padStart(2, '0')}T10:00:00.000Z`),
        lastMessageAt: new Date(`2025-10-${String(index + 1).padStart(2, '0')}T10:00:00.000Z`),
      });
    }

    const { agent } = await loginAdmin();
    const response = await agent.get('/api/v1/admin/dashboard/ticket-sections?limit=5');

    expect(response.status).toBe(200);
    expect(response.body.data.urgent.some((ticket) => ticket.id === staleCritical._id.toString())).toBe(
      true,
    );
    expect(response.body.data.urgent[0].priority).toBe(TICKET_PRIORITIES.CRITICAL);
  });

  it('excludes resolved and closed tickets from oldest unresolved results', async () => {
    const author = await createTestAuthor({
      email: 'closed.dashboard@bookleaf.test',
      authorId: 'AUTH902',
    });
    await createTestAdmin({ email: 'admin.dashboard@bookleaf.test' });

    await createTestTicket(author._id, {
      ticketNumber: 'TKT-9200',
      subject: 'Closed but old',
      status: TICKET_STATUSES.CLOSED,
      createdAt: new Date('2023-01-01T08:00:00.000Z'),
      lastMessageAt: new Date('2023-01-01T08:00:00.000Z'),
    });

    const openTicket = await createTestTicket(author._id, {
      ticketNumber: 'TKT-9201',
      subject: 'Still open',
      status: TICKET_STATUSES.OPEN,
      createdAt: new Date('2024-05-01T08:00:00.000Z'),
      lastMessageAt: new Date('2024-05-01T08:00:00.000Z'),
    });

    const { agent } = await loginAdmin();
    const response = await agent.get('/api/v1/admin/dashboard/ticket-sections?limit=5');

    expect(response.status).toBe(200);
    expect(response.body.data.oldestUnresolved).toHaveLength(1);
    expect(response.body.data.oldestUnresolved[0].id).toBe(openTicket._id.toString());
  });

  it('returns empty dashboard sections when no tickets exist', async () => {
    await createTestAdmin({ email: 'admin.dashboard@bookleaf.test' });
    const { agent } = await loginAdmin();

    const response = await agent.get('/api/v1/admin/dashboard/ticket-sections?limit=5');

    expect(response.status).toBe(200);
    expect(response.body.data.urgent).toEqual([]);
    expect(response.body.data.oldestUnresolved).toEqual([]);
    expect(response.body.data.recentlyUpdated).toEqual([]);
  });

  it('rejects unauthenticated and non-admin access', async () => {
    await createTestAdmin({ email: 'admin.dashboard@bookleaf.test' });
    await createTestAuthor({ email: 'author.dashboard@bookleaf.test', authorId: 'AUTH903' });

    const unauthenticated = await request(app).get('/api/v1/admin/dashboard/ticket-sections');
    expect(unauthenticated.status).toBe(401);

    const { agent } = await loginDirect(app, {
      email: 'author.dashboard@bookleaf.test',
      password: samplePassword,
    });
    const forbidden = await agent.get('/api/v1/admin/dashboard/ticket-sections');
    expect(forbidden.status).toBe(403);
  });
});
