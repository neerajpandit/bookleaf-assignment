import {
  BOOK_STATUSES,
  PRODUCTION_STATUSES,
} from '../../../lib/constants/bookStatus.js';

export function computeBookSummary(books) {
  const safeBooks = books ?? [];

  return {
    totalBooks: safeBooks.length,
    publishedBooks: safeBooks.filter((book) => book.status === BOOK_STATUSES.PUBLISHED_LIVE).length,
    booksInProduction: safeBooks.filter((book) => PRODUCTION_STATUSES.includes(book.status)).length,
    totalRoyaltiesEarned: safeBooks.reduce(
      (sum, book) => sum + (book.totalRoyaltyEarned ?? 0),
      0,
    ),
    totalRoyaltiesPaid: safeBooks.reduce((sum, book) => sum + (book.royaltyPaid ?? 0), 0),
    pendingRoyalties: safeBooks.reduce((sum, book) => sum + (book.royaltyPending ?? 0), 0),
  };
}

export default computeBookSummary;
