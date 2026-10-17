import Book from '../books/book.model.js';
import User from '../users/user.model.js';
import { ROLES } from '../../constants/roles.js';
import { getBookRoyaltySnapshot } from './mappers.js';

export const verifySeedResults = async (dataset) => {
  const issues = [];

  const authors = await User.find({
    role: ROLES.AUTHOR,
    authorId: { $exists: true, $ne: null },
  }).select('authorId');

  const authorIdToUserId = new Map(authors.map((user) => [user.authorId, user._id.toString()]));

  const [authorDuplicateGroups, bookDuplicateGroups, books] = await Promise.all([
    User.aggregate([
      { $match: { authorId: { $exists: true, $ne: null } } },
      { $group: { _id: '$authorId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]),
    Book.aggregate([
      { $group: { _id: '$bookId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]),
    Book.find().select(
      'bookId author totalCopiesSold totalRoyaltyEarned royaltyPaid royaltyPending publicationDate mrp authorRoyaltyPerCopy printPartner availableOn',
    ),
  ]);

  if (authorDuplicateGroups.length > 0) {
    issues.push({
      type: 'DUPLICATE_AUTHOR_ID',
      values: authorDuplicateGroups.map((group) => group._id),
    });
  }

  if (bookDuplicateGroups.length > 0) {
    issues.push({
      type: 'DUPLICATE_BOOK_ID',
      values: bookDuplicateGroups.map((group) => group._id),
    });
  }

  dataset.authors.forEach((author) => {
    if (!authorIdToUserId.has(author.author_id)) {
      issues.push({
        type: 'MISSING_AUTHOR',
        authorId: author.author_id,
      });
    }
  });

  const booksById = new Map(books.map((book) => [book.bookId, book]));

  dataset.books.forEach(({ authorId, book }) => {
    const expectedUserId = authorIdToUserId.get(authorId);
    const storedBook = booksById.get(book.book_id);

    if (!storedBook) {
      issues.push({
        type: 'MISSING_BOOK',
        bookId: book.book_id,
      });
      return;
    }

    if (!expectedUserId || storedBook.author.toString() !== expectedUserId) {
      issues.push({
        type: 'BOOK_AUTHOR_MISMATCH',
        bookId: book.book_id,
        expectedAuthorId: authorId,
      });
    }

    const snapshot = getBookRoyaltySnapshot(book);

    ['totalCopiesSold', 'totalRoyaltyEarned', 'royaltyPaid', 'royaltyPending'].forEach((field) => {
      if (storedBook[field] !== snapshot[field]) {
        issues.push({
          type: 'ROYALTY_MISMATCH',
          bookId: book.book_id,
          field,
        });
      }
    });
  });

  return {
    valid: issues.length === 0,
    importedAuthorCount: authorIdToUserId.size,
    importedBookCount: books.length,
    issues,
  };
};

export default verifySeedResults;
