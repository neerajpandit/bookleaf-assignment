import mongoose from 'mongoose';
import { BOOK_STATUS_VALUES } from '../../constants/bookStatus.js';

/**
 * JSON → Model field mapping:
 * - author_id        → author (ObjectId ref User) + denormalized lookup via User.authorId at seed time
 * - book_id          → bookId
 * - publication_date → publicationDate
 * - author_royalty_per_copy → authorRoyaltyPerCopy
 * - total_copies_sold → totalCopiesSold
 * - total_royalty_earned → totalRoyaltyEarned
 * - royalty_paid     → royaltyPaid
 * - royalty_pending  → royaltyPending
 * - last_royalty_payout_date → lastRoyaltyPayoutDate
 * - print_partner    → printPartner
 * - available_on     → availableOn
 */
const bookSchema = new mongoose.Schema(
  {
    bookId: {
      type: String,
      required: [true, 'Book source identifier is required'],
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author reference is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 200,
    },
    isbn: {
      type: String,
      required: [true, 'ISBN is required'],
      trim: true,
      maxlength: 20,
    },
    genre: {
      type: String,
      required: [true, 'Genre is required'],
      trim: true,
      maxlength: 100,
    },
    publicationDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: BOOK_STATUS_VALUES,
        message: '{VALUE} is not a valid book status',
      },
    },
    mrp: {
      type: Number,
      min: [0, 'MRP cannot be negative'],
      default: null,
    },
    authorRoyaltyPerCopy: {
      type: Number,
      min: [0, 'Author royalty per copy cannot be negative'],
      default: null,
    },
    totalCopiesSold: {
      type: Number,
      required: [true, 'Total copies sold is required'],
      min: [0, 'Total copies sold cannot be negative'],
      default: 0,
    },
    totalRoyaltyEarned: {
      type: Number,
      required: [true, 'Total royalty earned is required'],
      min: [0, 'Total royalty earned cannot be negative'],
      default: 0,
    },
    royaltyPaid: {
      type: Number,
      required: [true, 'Royalty paid is required'],
      min: [0, 'Royalty paid cannot be negative'],
      default: 0,
    },
    royaltyPending: {
      type: Number,
      required: [true, 'Royalty pending is required'],
      min: [0, 'Royalty pending cannot be negative'],
      default: 0,
    },
    lastRoyaltyPayoutDate: {
      type: Date,
      default: null,
    },
    printPartner: {
      type: String,
      trim: true,
      maxlength: 80,
      default: null,
    },
    availableOn: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

bookSchema.index({ bookId: 1 }, { unique: true });
bookSchema.index({ author: 1 });
bookSchema.index({ author: 1, status: 1 });

const Book = mongoose.models.Book || mongoose.model('Book', bookSchema);

export default Book;
