export const normalizeEmail = (email) => email.trim().toLowerCase();

export const mapAuthorProfile = (author) => ({
  email: normalizeEmail(author.email),
  authorId: author.author_id,
  name: author.name,
  phone: author.phone,
  city: author.city,
  joinedDate: author.joined_date ? new Date(author.joined_date) : undefined,
});

export const mapBookDocument = (book, authorObjectId) => ({
  bookId: book.book_id,
  author: authorObjectId,
  title: book.title,
  isbn: book.isbn,
  genre: book.genre,
  publicationDate: book.publication_date ? new Date(book.publication_date) : null,
  status: book.status,
  mrp: book.mrp ?? null,
  authorRoyaltyPerCopy: book.author_royalty_per_copy ?? null,
  totalCopiesSold: book.total_copies_sold,
  totalRoyaltyEarned: book.total_royalty_earned,
  royaltyPaid: book.royalty_paid,
  royaltyPending: book.royalty_pending,
  lastRoyaltyPayoutDate: book.last_royalty_payout_date
    ? new Date(book.last_royalty_payout_date)
    : null,
  printPartner: book.print_partner ?? null,
  availableOn: book.available_on ?? [],
});

export const getBookRoyaltySnapshot = (book) => ({
  bookId: book.book_id,
  totalCopiesSold: book.total_copies_sold,
  totalRoyaltyEarned: book.total_royalty_earned,
  royaltyPaid: book.royalty_paid,
  royaltyPending: book.royalty_pending,
});

export default {
  normalizeEmail,
  mapAuthorProfile,
  mapBookDocument,
  getBookRoyaltySnapshot,
};
