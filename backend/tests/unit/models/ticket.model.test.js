import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import User from '../../../src/modules/users/user.model.js';
import Book from '../../../src/modules/books/book.model.js';
import Ticket from '../../../src/modules/tickets/ticket.model.js';
import { ROLES } from '../../../src/constants/roles.js';
import { BOOK_STATUSES } from '../../../src/constants/bookStatus.js';
import { TICKET_STATUSES } from '../../../src/constants/ticketStatus.js';
import { TICKET_CATEGORIES } from '../../../src/constants/ticketCategory.js';
import { TICKET_PRIORITIES } from '../../../src/constants/ticketPriority.js';
import { AI_PROCESSING_STATUSES } from '../../../src/constants/aiProcessingStatus.js';
import { setupTestDb, teardownTestDb } from '../../setup/testDb.js';
import { clearDatabase, samplePasswordHash } from '../../helpers/modelTestHelper.js';

describe('Ticket model', () => {
  let author;
  let book;

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

    book = await Book.create({
      bookId: 'BK001',
      author: author._id,
      title: 'Whispers of the Ganges',
      isbn: '978-93-5XXXX-01-1',
      genre: 'Literary Fiction',
      status: BOOK_STATUSES.PUBLISHED_LIVE,
      totalCopiesSold: 342,
      totalRoyaltyEarned: 11970,
      royaltyPaid: 8400,
      royaltyPending: 3570,
    });
  });

  it('creates a valid ticket with an optional book reference', async () => {
    const ticket = await Ticket.create({
      ticketNumber: 'TKT-000001',
      author: author._id,
      book: book._id,
      subject: 'Royalty question',
      description: 'I have not received my latest royalty payout.',
      status: TICKET_STATUSES.OPEN,
      category: TICKET_CATEGORIES.ROYALTY_PAYMENTS,
      priority: TICKET_PRIORITIES.HIGH,
      aiCategory: TICKET_CATEGORIES.ROYALTY_PAYMENTS,
      aiPriority: TICKET_PRIORITIES.CRITICAL,
      aiProcessingStatus: AI_PROCESSING_STATUSES.COMPLETED,
      aiDraftResponse: 'Draft response text',
      aiProcessedAt: new Date(),
    });

    expect(ticket.book.toString()).toBe(book._id.toString());
    expect(ticket.aiCategory).toBe(TICKET_CATEGORIES.ROYALTY_PAYMENTS);
    expect(ticket.category).toBe(TICKET_CATEGORIES.ROYALTY_PAYMENTS);
    expect(ticket.aiPriority).toBe(TICKET_PRIORITIES.CRITICAL);
    expect(ticket.priority).toBe(TICKET_PRIORITIES.HIGH);
  });

  it('creates a general account-level ticket without a book reference', async () => {
    const ticket = await Ticket.create({
      ticketNumber: 'TKT-000002',
      author: author._id,
      subject: 'Account update',
      description: 'Please update my contact phone number.',
      status: TICKET_STATUSES.OPEN,
    });

    expect(ticket.book).toBeNull();
  });

  it('rejects invalid status, category, and priority values', async () => {
    const ticket = new Ticket({
      ticketNumber: 'TKT-000003',
      author: author._id,
      subject: 'Invalid enums',
      description: 'Testing invalid enum values.',
      status: 'OPENED',
      category: 'Payments',
      priority: 'URGENT',
    });

    await expect(ticket.validate()).rejects.toThrow(/not a valid ticket status/);
  });

  it('allows nullable AI metadata fields', async () => {
    const ticket = await Ticket.create({
      ticketNumber: 'TKT-000004',
      author: author._id,
      subject: 'Pending AI',
      description: 'Waiting for AI classification.',
      status: TICKET_STATUSES.OPEN,
      aiProcessingStatus: AI_PROCESSING_STATUSES.PENDING,
      aiCategory: null,
      aiPriority: null,
      aiDraftResponse: null,
      aiProcessedAt: null,
      aiError: null,
      category: null,
      priority: null,
    });

    expect(ticket.aiCategory).toBeNull();
    expect(ticket.aiDraftResponse).toBeNull();
    expect(ticket.aiProcessingStatus).toBe(AI_PROCESSING_STATUSES.PENDING);
  });
});
