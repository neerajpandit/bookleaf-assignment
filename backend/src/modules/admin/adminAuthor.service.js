import mongoose from 'mongoose';
import ApiError from '../../utils/ApiError.js';
import httpStatus from '../../constants/httpStatus.js';
import { ROLES } from '../../constants/roles.js';
import { TICKET_STATUSES } from '../../constants/ticketStatus.js';
import { escapeRegex } from '../../utils/escapeRegex.js';
import User from '../users/user.model.js';
import Book from '../books/book.model.js';
import { toPublicBook } from '../books/book.service.js';

const ADMIN_AUTHOR_SORT_FIELDS = {
  name: 'name',
  email: 'email',
  authorId: 'authorId',
  joinedDate: 'joinedDate',
  createdAt: 'createdAt',
};

export const toAdminAuthorListItem = (author) => ({
  authorUserId: author._id.toString(),
  authorId: author.authorId,
  name: author.name ?? null,
  email: author.email,
  phone: author.phone ?? null,
  city: author.city ?? null,
  joinedDate: author.joinedDate ?? null,
  bookCount: author.bookCount ?? 0,
  openTicketCount: author.openTicketCount ?? 0,
  pendingTicketCount: author.pendingTicketCount ?? 0,
});

export const toAdminAuthorProfile = (author) => ({
  authorUserId: author._id.toString(),
  authorId: author.authorId,
  name: author.name ?? null,
  email: author.email,
  phone: author.phone ?? null,
  city: author.city ?? null,
  joinedDate: author.joinedDate ?? null,
  isActive: author.isActive,
  createdAt: author.createdAt,
  updatedAt: author.updatedAt,
});

export const toAdminAuthorBook = (book) => ({
  id: book._id.toString(),
  ...toPublicBook(book),
});

const buildAuthorDirectoryMatch = ({ search }) => {
  const match = { role: ROLES.AUTHOR };

  if (search) {
    const escapedSearch = escapeRegex(search);
    match.$or = [
      { name: { $regex: escapedSearch, $options: 'i' } },
      { email: { $regex: escapedSearch, $options: 'i' } },
      { authorId: { $regex: escapedSearch, $options: 'i' } },
    ];
  }

  return match;
};

const buildAuthorDirectorySort = ({ sortBy, sortOrder }) => {
  const field = ADMIN_AUTHOR_SORT_FIELDS[sortBy] || ADMIN_AUTHOR_SORT_FIELDS.name;
  const direction = sortOrder === 'desc' ? -1 : 1;

  return {
    [field]: direction,
    _id: 1,
  };
};

export const getAdminAuthorOrThrow = async (authorUserId) => {
  const author = await User.findById(authorUserId).select(
    '-passwordHash -tokenVersion',
  );

  if (!author || author.role !== ROLES.AUTHOR) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Author not found');
  }

  return author;
};

export const listAdminAuthors = async (query) => {
  const { page, limit } = query;
  const match = buildAuthorDirectoryMatch(query);
  const skip = (page - 1) * limit;

  const [total, authors] = await Promise.all([
    User.countDocuments(match),
    User.aggregate([
      { $match: match },
      { $sort: buildAuthorDirectorySort(query) },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: Book.collection.name,
          localField: '_id',
          foreignField: 'author',
          pipeline: [{ $count: 'count' }],
          as: 'bookCountData',
        },
      },
      {
        $lookup: {
          from: 'tickets',
          localField: '_id',
          foreignField: 'author',
          pipeline: [
            {
              $group: {
                _id: null,
                openTicketCount: {
                  $sum: {
                    $cond: [
                      {
                        $in: [
                          '$status',
                          [TICKET_STATUSES.OPEN, TICKET_STATUSES.IN_PROGRESS],
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                pendingTicketCount: {
                  $sum: {
                    $cond: [{ $eq: ['$status', TICKET_STATUSES.OPEN] }, 1, 0],
                  },
                },
              },
            },
          ],
          as: 'ticketCountData',
        },
      },
      {
        $addFields: {
          bookCount: {
            $ifNull: [{ $arrayElemAt: ['$bookCountData.count', 0] }, 0],
          },
          openTicketCount: {
            $ifNull: [{ $arrayElemAt: ['$ticketCountData.openTicketCount', 0] }, 0],
          },
          pendingTicketCount: {
            $ifNull: [{ $arrayElemAt: ['$ticketCountData.pendingTicketCount', 0] }, 0],
          },
        },
      },
      {
        $project: {
          passwordHash: 0,
          tokenVersion: 0,
          bookCountData: 0,
          ticketCountData: 0,
        },
      },
    ]),
  ]);

  return {
    items: authors.map(toAdminAuthorListItem),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

export const getAdminAuthorById = async (authorUserId) => {
  const author = await getAdminAuthorOrThrow(authorUserId);
  return toAdminAuthorProfile(author);
};

const buildAdminAuthorBookFilter = (authorUserId, { status, search }) => {
  const filter = { author: authorUserId };

  if (status) {
    filter.status = status;
  }

  if (search) {
    filter.title = { $regex: escapeRegex(search), $options: 'i' };
  }

  return filter;
};

export const listAdminAuthorBooks = async (authorUserId, query) => {
  await getAdminAuthorOrThrow(authorUserId);

  const { page, limit, status, search } = query;
  const filter = buildAdminAuthorBookFilter(authorUserId, { status, search });
  const skip = (page - 1) * limit;

  const [books, total] = await Promise.all([
    Book.find(filter).sort({ title: 1, bookId: 1 }).skip(skip).limit(limit).lean(),
    Book.countDocuments(filter),
  ]);

  return {
    items: books.map((book) => toAdminAuthorBook(book)),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

export const getAdminAuthorRoyaltySummary = async (authorUserId) => {
  await getAdminAuthorOrThrow(authorUserId);

  const authorObjectId = new mongoose.Types.ObjectId(authorUserId);

  const [summary] = await Book.aggregate([
    { $match: { author: authorObjectId } },
    {
      $group: {
        _id: null,
        totalRoyaltyEarned: { $sum: '$totalRoyaltyEarned' },
        totalRoyaltyPaid: { $sum: '$royaltyPaid' },
        totalRoyaltyPending: { $sum: '$royaltyPending' },
        lastRoyaltyPayoutDate: { $max: '$lastRoyaltyPayoutDate' },
      },
    },
  ]);

  if (!summary) {
    return {
      totalRoyaltyEarned: 0,
      totalRoyaltyPaid: 0,
      totalRoyaltyPending: 0,
      lastRoyaltyPayoutDate: null,
    };
  }

  return {
    totalRoyaltyEarned: summary.totalRoyaltyEarned,
    totalRoyaltyPaid: summary.totalRoyaltyPaid,
    totalRoyaltyPending: summary.totalRoyaltyPending,
    lastRoyaltyPayoutDate: summary.lastRoyaltyPayoutDate ?? null,
  };
};

export default {
  listAdminAuthors,
  getAdminAuthorById,
  listAdminAuthorBooks,
  getAdminAuthorRoyaltySummary,
  toAdminAuthorListItem,
  toAdminAuthorProfile,
  toAdminAuthorBook,
  getAdminAuthorOrThrow,
};
