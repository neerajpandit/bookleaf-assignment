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
import User from '../../src/modules/users/user.model.js';
import { TICKET_STATUSES } from '../../src/constants/ticketStatus.js';
import { BOOK_STATUSES } from '../../src/constants/bookStatus.js';

describe('Admin Authors API', () => {
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

  const loginAdmin = (email = 'admin.authors@bookleaf.test') =>
    loginDirect(app, { email, password: samplePassword });

  const seedAuthorsFixture = async () => {
    await createTestAdmin({ email: 'admin.authors@bookleaf.test' });

    const authorOne = await createTestAuthor({
      email: 'priya.authors@bookleaf.test',
      authorId: 'AUTH001',
      name: 'Priya Sharma',
      phone: '+91-90000-00001',
      city: 'Mumbai',
      joinedDate: new Date('2023-01-15'),
    });

    const authorTwo = await createTestAuthor({
      email: 'amit.authors@bookleaf.test',
      authorId: 'AUTH002',
      name: 'Amit Verma',
      phone: '+91-90000-00002',
      city: 'Delhi',
      joinedDate: new Date('2023-03-10'),
    });

    await createTestBook(authorOne._id, {
      bookId: 'BK001',
      totalRoyaltyEarned: 10000,
      royaltyPaid: 7000,
      royaltyPending: 3000,
      lastRoyaltyPayoutDate: new Date('2025-10-01'),
    });

    await createTestBook(authorOne._id, {
      bookId: 'BK002',
      title: 'Second Book',
      isbn: '978-93-5XXXX-02-2',
      totalRoyaltyEarned: 5000,
      royaltyPaid: 2000,
      royaltyPending: 3000,
      lastRoyaltyPayoutDate: new Date('2025-11-01'),
    });

    await createTestBook(authorTwo._id, {
      bookId: 'BK003',
      title: 'Other Author Book',
      isbn: '978-93-5XXXX-03-3',
      totalRoyaltyEarned: 1200,
      royaltyPaid: 1200,
      royaltyPending: 0,
    });

    await createTestTicket(authorOne._id, {
      ticketNumber: 'TKT-7001',
      status: TICKET_STATUSES.OPEN,
    });
    await createTestTicket(authorOne._id, {
      ticketNumber: 'TKT-7002',
      status: TICKET_STATUSES.IN_PROGRESS,
    });
    await createTestTicket(authorOne._id, {
      ticketNumber: 'TKT-7003',
      status: TICKET_STATUSES.CLOSED,
    });
    await createTestTicket(authorTwo._id, {
      ticketNumber: 'TKT-7004',
      status: TICKET_STATUSES.OPEN,
    });

    return { authorOne, authorTwo };
  };

  describe('GET /api/v1/admin/authors', () => {
    it(
      'returns a paginated author directory for admins',
      async () => {
        const { authorOne } = await seedAuthorsFixture();
        const { agent } = await loginAdmin();

        const response = await agent.get('/api/v1/admin/authors');

        expect(response.status).toBe(200);
        expect(response.body.data.items).toHaveLength(2);
        expect(response.body.data.pagination).toEqual({
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        });

        const priya = response.body.data.items.find(
          (item) => item.authorUserId === authorOne._id.toString(),
        );

        expect(priya).toMatchObject({
          authorId: 'AUTH001',
          name: 'Priya Sharma',
          email: 'priya.authors@bookleaf.test',
          bookCount: 2,
          openTicketCount: 2,
          pendingTicketCount: 1,
        });
        expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|tokenVersion/);
      },
      60000,
    );

    it('excludes admin users from the directory', async () => {
      await seedAuthorsFixture();
      const { agent } = await loginAdmin();

      const response = await agent.get('/api/v1/admin/authors');

      expect(response.body.data.items.every((item) => item.authorId?.startsWith('AUTH'))).toBe(
        true,
      );
      expect(response.body.data.items.some((item) => item.email === 'admin.authors@bookleaf.test')).toBe(
        false,
      );
    });

    it(
      'supports search by name, email, and source author ID',
      async () => {
        await seedAuthorsFixture();
        const { agent } = await loginAdmin();

        const byName = await agent.get('/api/v1/admin/authors').query({ search: 'Priya' });
        expect(byName.body.data.items).toHaveLength(1);
        expect(byName.body.data.items[0].authorId).toBe('AUTH001');

        const byEmail = await agent.get('/api/v1/admin/authors').query({ search: 'amit.authors' });
        expect(byEmail.body.data.items).toHaveLength(1);

        const bySourceId = await agent.get('/api/v1/admin/authors').query({ search: 'AUTH002' });
        expect(bySourceId.body.data.items).toHaveLength(1);
      },
      60000,
    );

    it('returns empty results when search matches nothing', async () => {
      await seedAuthorsFixture();
      const { agent } = await loginAdmin();

      const response = await agent.get('/api/v1/admin/authors').query({ search: 'missing-author' });

      expect(response.status).toBe(200);
      expect(response.body.data.items).toEqual([]);
      expect(response.body.data.pagination.total).toBe(0);
    });

    it('rejects unauthenticated and non-admin access', async () => {
      await seedAuthorsFixture();

      const unauthenticated = await request(app).get('/api/v1/admin/authors');
      expect(unauthenticated.status).toBe(401);

      const { agent: authorAgent } = await loginDirect(app, {
        email: 'priya.authors@bookleaf.test',
        password: samplePassword,
      });

      const forbidden = await authorAgent.get('/api/v1/admin/authors');
      expect(forbidden.status).toBe(403);
    });
  });

  describe('GET /api/v1/admin/authors/:authorUserId', () => {
    it('returns a full author profile without sensitive fields', async () => {
      const { authorOne } = await seedAuthorsFixture();
      const { agent } = await loginAdmin();

      const response = await agent.get(`/api/v1/admin/authors/${authorOne._id.toString()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.author).toMatchObject({
        authorUserId: authorOne._id.toString(),
        authorId: 'AUTH001',
        name: 'Priya Sharma',
        phone: '+91-90000-00001',
        city: 'Mumbai',
        isActive: true,
      });
      expect(response.body.data.author.joinedDate).toBeTruthy();
      expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|tokenVersion/);
    });

    it('returns 404 for missing authors and admin accounts', async () => {
      await seedAuthorsFixture();
      const admin = await User.findOne({ email: 'admin.authors@bookleaf.test' });
      const { agent } = await loginAdmin();

      const missing = await agent.get('/api/v1/admin/authors/665f1c2d3a4b5c6d7e8f9999');
      expect(missing.status).toBe(404);

      const adminAsAuthor = await agent.get(`/api/v1/admin/authors/${admin._id.toString()}`);
      expect(adminAsAuthor.status).toBe(404);
    });

    it('rejects malformed author identifiers', async () => {
      await seedAuthorsFixture();
      const { agent } = await loginAdmin();

      const response = await agent.get('/api/v1/admin/authors/not-an-object-id');
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/admin/authors/:authorUserId/books', () => {
    it('returns only the selected author books with stored financial values', async () => {
      const { authorOne, authorTwo } = await seedAuthorsFixture();
      const { agent } = await loginAdmin();

      const response = await agent.get(`/api/v1/admin/authors/${authorOne._id.toString()}/books`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.items.every((book) => book.bookId.startsWith('BK00'))).toBe(true);
      expect(response.body.data.items[0]).toMatchObject({
        totalRoyaltyEarned: expect.any(Number),
        royaltyPaid: expect.any(Number),
        royaltyPending: expect.any(Number),
      });
      expect(response.body.data.items.some((book) => book.title === 'Other Author Book')).toBe(
        false,
      );

      const otherAuthorResponse = await agent.get(
        `/api/v1/admin/authors/${authorTwo._id.toString()}/books`,
      );
      expect(otherAuthorResponse.body.data.items).toHaveLength(1);
      expect(otherAuthorResponse.body.data.items[0].bookId).toBe('BK003');
    });

    it('supports book status filtering and pagination', async () => {
      const { authorOne } = await seedAuthorsFixture();
      await createTestBook(authorOne._id, {
        bookId: 'BK004',
        title: 'In Production Title',
        isbn: '978-93-5XXXX-04-4',
        status: BOOK_STATUSES.IN_PRODUCTION_TYPESETTING,
        publicationDate: null,
        mrp: null,
        authorRoyaltyPerCopy: null,
        totalCopiesSold: 0,
        totalRoyaltyEarned: 0,
        royaltyPaid: 0,
        royaltyPending: 0,
        lastRoyaltyPayoutDate: null,
      });

      const { agent } = await loginAdmin();

      const filtered = await agent
        .get(`/api/v1/admin/authors/${authorOne._id.toString()}/books`)
        .query({ status: BOOK_STATUSES.IN_PRODUCTION_TYPESETTING, limit: 1, page: 1 });

      expect(filtered.status).toBe(200);
      expect(filtered.body.data.items).toHaveLength(1);
      expect(filtered.body.data.items[0].title).toBe('In Production Title');
      expect(filtered.body.data.pagination.total).toBe(1);
    });
  });

  describe('GET /api/v1/admin/authors/:authorUserId/royalty-summary', () => {
    it('aggregates royalty totals from the author books only', async () => {
      const { authorOne } = await seedAuthorsFixture();
      const { agent } = await loginAdmin();

      const response = await agent.get(
        `/api/v1/admin/authors/${authorOne._id.toString()}/royalty-summary`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.summary).toEqual({
        totalRoyaltyEarned: 15000,
        totalRoyaltyPaid: 9000,
        totalRoyaltyPending: 6000,
        lastRoyaltyPayoutDate: new Date('2025-11-01').toISOString(),
      });
    });

    it('returns zero totals for authors without books', async () => {
      await seedAuthorsFixture();
      const authorWithoutBooks = await createTestAuthor({
        email: 'empty.authors@bookleaf.test',
        authorId: 'AUTH099',
        name: 'Empty Author',
      });
      const { agent } = await loginAdmin();

      const response = await agent.get(
        `/api/v1/admin/authors/${authorWithoutBooks._id.toString()}/royalty-summary`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.summary).toEqual({
        totalRoyaltyEarned: 0,
        totalRoyaltyPaid: 0,
        totalRoyaltyPending: 0,
        lastRoyaltyPayoutDate: null,
      });
    });
  });

  describe('GET /api/v1/admin/tickets?authorId=', () => {
    it('filters tickets by author MongoDB user id with accurate pagination totals', async () => {
      const { authorOne, authorTwo } = await seedAuthorsFixture();
      const { agent } = await loginAdmin();

      const response = await agent.get('/api/v1/admin/tickets').query({
        authorId: authorOne._id.toString(),
        limit: 2,
        page: 1,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(3);
      expect(
        response.body.data.items.every(
          (ticket) => ticket.author.id === authorOne._id.toString(),
        ),
      ).toBe(true);

      const otherAuthorTickets = await agent.get('/api/v1/admin/tickets').query({
        authorId: authorTwo._id.toString(),
      });
      expect(otherAuthorTickets.body.data.pagination.total).toBe(1);
    });

    it('combines authorId with status filters', async () => {
      const { authorOne } = await seedAuthorsFixture();
      const { agent } = await loginAdmin();

      const response = await agent.get('/api/v1/admin/tickets').query({
        authorId: authorOne._id.toString(),
        status: TICKET_STATUSES.OPEN,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.total).toBe(1);
      expect(response.body.data.items[0].status).toBe(TICKET_STATUSES.OPEN);
    });

    it('rejects invalid authorId query values', async () => {
      await seedAuthorsFixture();
      const { agent } = await loginAdmin();

      const response = await agent.get('/api/v1/admin/tickets').query({ authorId: 'invalid' });
      expect(response.status).toBe(400);
    });
  });
});
