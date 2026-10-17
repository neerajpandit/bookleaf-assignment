import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import User from '../../../src/modules/users/user.model.js';
import Book from '../../../src/modules/books/book.model.js';
import { ROLES } from '../../../src/constants/roles.js';
import { BOOK_STATUSES } from '../../../src/constants/bookStatus.js';
import { setupTestDb, teardownTestDb } from '../../setup/testDb.js';
import { clearDatabase, samplePasswordHash } from '../../helpers/modelTestHelper.js';

describe('Book model', () => {
  let author;

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
  });

  it('creates a valid published book', async () => {
    const book = await Book.create({
      bookId: 'BK001',
      author: author._id,
      title: 'Whispers of the Ganges',
      isbn: '978-93-5XXXX-01-1',
      genre: 'Literary Fiction',
      publicationDate: new Date('2023-06-20'),
      status: BOOK_STATUSES.PUBLISHED_LIVE,
      mrp: 399,
      authorRoyaltyPerCopy: 35,
      totalCopiesSold: 342,
      totalRoyaltyEarned: 11970,
      royaltyPaid: 8400,
      royaltyPending: 3570,
      lastRoyaltyPayoutDate: new Date('2025-10-15'),
      printPartner: 'In-House',
      availableOn: ['Amazon India', 'Flipkart', 'BookLeaf Store'],
    });

    expect(book.bookId).toBe('BK001');
    expect(book.author.toString()).toBe(author._id.toString());
    expect(book.mrp).toBe(399);
    expect(book.availableOn).toHaveLength(3);
  });

  it('creates a valid in-production book with nullable metadata', async () => {
    const book = await Book.create({
      bookId: 'BK013',
      author: author._id,
      title: 'Midnight in Mysore',
      isbn: '978-93-5XXXX-13-4',
      genre: 'Thriller',
      publicationDate: null,
      status: BOOK_STATUSES.IN_PRODUCTION_COVER_DESIGN,
      mrp: null,
      authorRoyaltyPerCopy: null,
      totalCopiesSold: 0,
      totalRoyaltyEarned: 0,
      royaltyPaid: 0,
      royaltyPending: 0,
      lastRoyaltyPayoutDate: null,
      printPartner: null,
      availableOn: [],
    });

    expect(book.publicationDate).toBeNull();
    expect(book.mrp).toBeNull();
    expect(book.authorRoyaltyPerCopy).toBeNull();
    expect(book.lastRoyaltyPayoutDate).toBeNull();
    expect(book.printPartner).toBeNull();
    expect(book.availableOn).toEqual([]);
  });

  it('rejects invalid numeric values', async () => {
    const book = new Book({
      bookId: 'BK999',
      author: author._id,
      title: 'Invalid Numbers',
      isbn: '978-93-5XXXX-99-9',
      genre: 'Test',
      status: BOOK_STATUSES.PUBLISHED_LIVE,
      mrp: -10,
      totalCopiesSold: 0,
      totalRoyaltyEarned: 0,
      royaltyPaid: 0,
      royaltyPending: 0,
    });

    await expect(book.validate()).rejects.toThrow(/MRP cannot be negative/);
  });

  it('rejects missing required book source identifier', async () => {
    const book = new Book({
      author: author._id,
      title: 'Missing Id',
      isbn: '978-93-5XXXX-00-0',
      genre: 'Test',
      status: BOOK_STATUSES.PUBLISHED_LIVE,
      totalCopiesSold: 0,
      totalRoyaltyEarned: 0,
      royaltyPaid: 0,
      royaltyPending: 0,
    });

    await expect(book.validate()).rejects.toThrow(/Book source identifier is required/);
  });

  it('enforces unique bookId through the database index', async () => {
    await Book.create({
      bookId: 'BK001',
      author: author._id,
      title: 'First Book',
      isbn: '978-93-5XXXX-01-1',
      genre: 'Literary Fiction',
      status: BOOK_STATUSES.PUBLISHED_LIVE,
      totalCopiesSold: 1,
      totalRoyaltyEarned: 10,
      royaltyPaid: 0,
      royaltyPending: 10,
    });

    await expect(
      Book.create({
        bookId: 'BK001',
        author: author._id,
        title: 'Duplicate Book',
        isbn: '978-93-5XXXX-01-2',
        genre: 'Literary Fiction',
        status: BOOK_STATUSES.PUBLISHED_LIVE,
        totalCopiesSold: 0,
        totalRoyaltyEarned: 0,
        royaltyPaid: 0,
        royaltyPending: 0,
      }),
    ).rejects.toThrow(/duplicate key/i);
  });
});
