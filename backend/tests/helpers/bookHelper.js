import Book from '../../src/modules/books/book.model.js';
import { BOOK_STATUSES } from '../../src/constants/bookStatus.js';

export const createTestBook = async (authorUserId, overrides = {}) =>
  Book.create({
    bookId: 'BK001',
    author: authorUserId,
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
    ...overrides,
  });

export const createInProductionBook = async (authorUserId, overrides = {}) =>
  createTestBook(authorUserId, {
    bookId: 'BK013',
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
    ...overrides,
  });
