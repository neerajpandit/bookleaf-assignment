import { describe, expect, it } from 'vitest';
import { validateCreateTicket, validateMessageBody } from './ticketValidation.js';
import { TICKET_CONTEXTS } from '../../../lib/constants/ticketContext.js';

describe('validateCreateTicket', () => {
  it('requires a book for book-specific tickets', () => {
    const result = validateCreateTicket({
      categoryContext: TICKET_CONTEXTS.BOOK_SPECIFIC,
      bookId: '',
      subject: 'Help',
      description: 'Need assistance',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.bookId).toBeDefined();
  });

  it('accepts general account tickets without a book', () => {
    const result = validateCreateTicket({
      categoryContext: TICKET_CONTEXTS.GENERAL_ACCOUNT,
      subject: 'Account question',
      description: 'Need help with my profile',
    });

    expect(result.isValid).toBe(true);
  });
});

describe('validateMessageBody', () => {
  it('rejects empty messages', () => {
    expect(validateMessageBody('   ').isValid).toBe(false);
  });
});
