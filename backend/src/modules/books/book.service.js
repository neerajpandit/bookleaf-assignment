import ApiError from '../../utils/ApiError.js';
import httpStatus from '../../constants/httpStatus.js';
import { escapeRegex } from '../../utils/escapeRegex.js';
import Book from './book.model.js';

export const toPublicBook = (book) => ({
  bookId: book.bookId,
  title: book.title,
  isbn: book.isbn,
  genre: book.genre,
  publicationDate: book.publicationDate ?? null,
  status: book.status,
  mrp: book.mrp ?? null,
  authorRoyaltyPerCopy: book.authorRoyaltyPerCopy ?? null,
  totalCopiesSold: book.totalCopiesSold,
  totalRoyaltyEarned: book.totalRoyaltyEarned,
  royaltyPaid: book.royaltyPaid,
  royaltyPending: book.royaltyPending,
  lastRoyaltyPayoutDate: book.lastRoyaltyPayoutDate ?? null,
  printPartner: book.printPartner ?? null,
  availableOn: book.availableOn ?? [],
});

const buildAuthorBookFilter = (authorUserId, { status, search }) => {
  const filter = { author: authorUserId };

  if (status) {
    filter.status = status;
  }

  if (search) {
    filter.title = { $regex: escapeRegex(search), $options: 'i' };
  }

  return filter;
};

export const listAuthorBooks = async (authorUserId, query) => {
  const { page, limit, status, search } = query;
  const filter = buildAuthorBookFilter(authorUserId, { status, search });
  const skip = (page - 1) * limit;

  const [books, total] = await Promise.all([
    Book.find(filter).sort({ title: 1, bookId: 1 }).skip(skip).limit(limit),
    Book.countDocuments(filter),
  ]);

  return {
    items: books.map(toPublicBook),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

export const getAuthorBookById = async (authorUserId, bookId) => {
  const book = await Book.findOne({ bookId, author: authorUserId });

  if (!book) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Book not found');
  }

  return toPublicBook(book);
};
