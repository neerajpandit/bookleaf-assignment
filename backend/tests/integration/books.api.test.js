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
import { createTestBook, createInProductionBook } from '../helpers/bookHelper.js';
import { BOOK_STATUSES } from '../../src/constants/bookStatus.js';

describe('Books API', () => {
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

  describe('GET /api/v1/books', () => {
    it('returns only the authenticated author books with pagination metadata', async () => {
      const author = await createTestAuthor({
        email: 'author.books@bookleaf.test',
        authorId: 'AUTH001',
      });
      const otherAuthor = await createTestAuthor({
        email: 'other.author@bookleaf.test',
        authorId: 'AUTH002',
      });

      await createTestBook(author._id, { bookId: 'BK001', title: 'Alpha Book' });
      await createTestBook(author._id, { bookId: 'BK002', title: 'Beta Book' });
      await createTestBook(otherAuthor._id, { bookId: 'BK003', title: 'Other Book' });

      const { agent } = await loginDirect(app, {
        email: 'author.books@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get('/api/v1/books?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
      expect(response.body.data.items.map((book) => book.bookId).sort()).toEqual(['BK001', 'BK002']);
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });

    it('returns an empty list when the author has no books', async () => {
      await createTestAuthor({
        email: 'empty.author@bookleaf.test',
        authorId: 'AUTH003',
      });

      const { agent } = await loginDirect(app, {
        email: 'empty.author@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get('/api/v1/books');

      expect(response.status).toBe(200);
      expect(response.body.data.items).toEqual([]);
      expect(response.body.data.pagination.total).toBe(0);
      expect(response.body.data.pagination.totalPages).toBe(0);
    });

    it('supports status filtering', async () => {
      const author = await createTestAuthor({
        email: 'filter.author@bookleaf.test',
        authorId: 'AUTH004',
      });

      await createTestBook(author._id, { bookId: 'BK001' });
      await createInProductionBook(author._id, { bookId: 'BK013' });

      const { agent } = await loginDirect(app, {
        email: 'filter.author@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get(
        `/api/v1/books?status=${encodeURIComponent(BOOK_STATUSES.IN_PRODUCTION_COVER_DESIGN)}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].bookId).toBe('BK013');
    });

    it('supports case-insensitive title search', async () => {
      const author = await createTestAuthor({
        email: 'search.author@bookleaf.test',
        authorId: 'AUTH005',
      });

      await createTestBook(author._id, { bookId: 'BK001', title: 'Whispers of the Ganges' });
      await createTestBook(author._id, { bookId: 'BK002', title: 'Startup Sutra' });

      const { agent } = await loginDirect(app, {
        email: 'search.author@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get('/api/v1/books?search=whispers');

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].title).toBe('Whispers of the Ganges');
    });

    it('rejects invalid pagination and status query values', async () => {
      await createTestAuthor({
        email: 'invalid.query@bookleaf.test',
        authorId: 'AUTH006',
      });

      const { agent } = await loginDirect(app, {
        email: 'invalid.query@bookleaf.test',
        password: samplePassword,
      });

      const pageResponse = await agent.get('/api/v1/books?page=0');
      expect(pageResponse.status).toBe(400);

      const limitResponse = await agent.get('/api/v1/books?limit=100');
      expect(limitResponse.status).toBe(400);

      const statusResponse = await agent.get('/api/v1/books?status=Invalid%20Status');
      expect(statusResponse.status).toBe(400);
      expect(statusResponse.body.message).toBe('Validation failed');
    });

    it('rejects unauthenticated requests', async () => {
      const response = await request(app).get('/api/v1/books');
      expect(response.status).toBe(401);
    });

    it('rejects unsupported roles such as admin', async () => {
      await createTestAdmin({ email: 'admin.books@bookleaf.test' });

      const { agent } = await loginDirect(app, {
        email: 'admin.books@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get('/api/v1/books');
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/books/:bookId', () => {
    it('returns a book owned by the authenticated author', async () => {
      const author = await createTestAuthor({
        email: 'detail.author@bookleaf.test',
        authorId: 'AUTH007',
      });

      await createTestBook(author._id, { bookId: 'BK001' });

      const { agent } = await loginDirect(app, {
        email: 'detail.author@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get('/api/v1/books/BK001');

      expect(response.status).toBe(200);
      expect(response.body.data.book).toMatchObject({
        bookId: 'BK001',
        title: 'Whispers of the Ganges',
        isbn: '978-93-5XXXX-01-1',
        totalCopiesSold: 342,
        royaltyPending: 3570,
        availableOn: ['Amazon India', 'Flipkart', 'BookLeaf Store'],
      });
      expect(response.body.data.book.author).toBeUndefined();
      expect(response.body.data.book._id).toBeUndefined();
    });

    it('returns nullable metadata for in-production books', async () => {
      const author = await createTestAuthor({
        email: 'nullable.author@bookleaf.test',
        authorId: 'AUTH008',
      });

      await createInProductionBook(author._id);

      const { agent } = await loginDirect(app, {
        email: 'nullable.author@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get('/api/v1/books/BK013');

      expect(response.status).toBe(200);
      expect(response.body.data.book).toMatchObject({
        bookId: 'BK013',
        publicationDate: null,
        mrp: null,
        authorRoyaltyPerCopy: null,
        lastRoyaltyPayoutDate: null,
        printPartner: null,
        availableOn: [],
      });
    });

    it('returns not found for a missing book identifier', async () => {
      const author = await createTestAuthor({
        email: 'missing.author@bookleaf.test',
        authorId: 'AUTH009',
      });
      await createTestBook(author._id, { bookId: 'BK001' });

      const { agent } = await loginDirect(app, {
        email: 'missing.author@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get('/api/v1/books/BK999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Book not found');
    });

    it('does not expose another author book', async () => {
      const owner = await createTestAuthor({
        email: 'owner.author@bookleaf.test',
        authorId: 'AUTH010',
      });
      const other = await createTestAuthor({
        email: 'other.detail@bookleaf.test',
        authorId: 'AUTH011',
      });

      await createTestBook(owner._id, { bookId: 'BK001' });

      const { agent } = await loginDirect(app, {
        email: 'other.detail@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get('/api/v1/books/BK001');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Book not found');
    });

    it('rejects invalid source book identifiers', async () => {
      await createTestAuthor({
        email: 'invalid.id@bookleaf.test',
        authorId: 'AUTH012',
      });

      const { agent } = await loginDirect(app, {
        email: 'invalid.id@bookleaf.test',
        password: samplePassword,
      });

      const response = await agent.get('/api/v1/books/INVALID');
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
    });

    it('rejects unauthenticated requests', async () => {
      const response = await request(app).get('/api/v1/books/BK001');
      expect(response.status).toBe(401);
    });
  });
});
