import Joi from 'joi';
import { BOOK_STATUS_VALUES } from '../../constants/bookStatus.js';

const mongoObjectIdSchema = Joi.string().hex().length(24).messages({
  'string.hex': 'authorUserId must be a valid user identifier',
  'string.length': 'authorUserId must be a valid user identifier',
});

export const adminAuthorUserIdParamSchema = Joi.object({
  authorUserId: mongoObjectIdSchema.required(),
});

const ADMIN_AUTHOR_SORT_FIELDS = ['name', 'email', 'authorId', 'joinedDate', 'createdAt'];

export const adminAuthorDirectoryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(200).optional(),
  sortBy: Joi.string()
    .valid(...ADMIN_AUTHOR_SORT_FIELDS)
    .default('name'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

export const adminAuthorBooksQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  status: Joi.string()
    .valid(...BOOK_STATUS_VALUES)
    .optional(),
  search: Joi.string().trim().max(200).optional(),
});

export default {
  adminAuthorUserIdParamSchema,
  adminAuthorDirectoryQuerySchema,
  adminAuthorBooksQuerySchema,
};
