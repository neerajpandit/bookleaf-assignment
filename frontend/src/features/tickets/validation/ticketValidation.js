import { TICKET_CONTEXTS } from '../../../lib/constants/ticketContext.js';

export function validateCreateTicket({ categoryContext, bookId, subject, description }) {
  const errors = {};
  const trimmedSubject = subject?.trim() ?? '';
  const trimmedDescription = description?.trim() ?? '';

  if (!trimmedSubject) {
    errors.subject = 'Subject is required';
  } else if (trimmedSubject.length > 200) {
    errors.subject = 'Subject must be 200 characters or less';
  }

  if (!trimmedDescription) {
    errors.description = 'Description is required';
  } else if (trimmedDescription.length > 5000) {
    errors.description = 'Description must be 5000 characters or less';
  }

  if (categoryContext === TICKET_CONTEXTS.BOOK_SPECIFIC && !bookId) {
    errors.bookId = 'Please select a book for book-specific tickets';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateMessageBody(body) {
  const trimmed = body?.trim() ?? '';

  if (!trimmed) {
    return { isValid: false, error: 'Message is required' };
  }

  if (trimmed.length > 10000) {
    return { isValid: false, error: 'Message must be 10,000 characters or less' };
  }

  return { isValid: true, error: null };
}

export default validateCreateTicket;
