import Joi from 'joi';
import { BOOK_STATUS_VALUES } from '../../constants/bookStatus.js';

export const listBooksQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  status: Joi.string()
    .valid(...BOOK_STATUS_VALUES)
    .optional(),
  search: Joi.string().trim().max(200).optional(),
});

export const bookIdParamSchema = Joi.object({
  bookId: Joi.string()
    .trim()
    .pattern(/^BK\d{3}$/)
    .required()
    .messages({
      'string.pattern.base': 'bookId must be a valid source book identifier (e.g. BK001)',
    }),
});

export default {
  listBooksQuerySchema,
  bookIdParamSchema,
};
