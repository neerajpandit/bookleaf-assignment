import Joi from 'joi';
import { TICKET_CONTEXT_VALUES } from '../../constants/ticketContext.js';
import { TICKET_STATUS_VALUES } from '../../constants/ticketStatus.js';
import { TICKET_CATEGORY_VALUES } from '../../constants/ticketCategory.js';

export const createTicketSchema = Joi.object({
  subject: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().min(1).max(5000).required(),
  bookId: Joi.string()
    .trim()
    .pattern(/^BK\d{3}$/)
    .optional()
    .messages({
      'string.pattern.base': 'bookId must be a valid source book identifier (e.g. BK001)',
    }),
  categoryContext: Joi.string()
    .valid(...TICKET_CONTEXT_VALUES)
    .optional(),
})
  .custom((value, helpers) => {
    if (value.categoryContext === 'GENERAL_ACCOUNT' && value.bookId) {
      return helpers.message({
        custom: 'General account tickets cannot reference a book',
      });
    }

    return value;
  })
  .messages({
    'any.custom': 'General account tickets cannot reference a book',
  });

export const listTicketsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  status: Joi.string()
    .valid(...TICKET_STATUS_VALUES)
    .optional(),
  category: Joi.string()
    .valid(...TICKET_CATEGORY_VALUES)
    .optional(),
  search: Joi.string().trim().max(200).optional(),
});

export const ticketIdParamSchema = Joi.object({
  ticketId: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      'string.hex': 'ticketId must be a valid ticket identifier',
      'string.length': 'ticketId must be a valid ticket identifier',
    }),
});

export const createTicketMessageSchema = Joi.object({
  body: Joi.string().trim().min(1).max(10000).required(),
  senderId: Joi.forbidden(),
  senderRole: Joi.forbidden(),
  author: Joi.forbidden(),
  authorId: Joi.forbidden(),
});

export default {
  createTicketSchema,
  listTicketsQuerySchema,
  ticketIdParamSchema,
  createTicketMessageSchema,
};
