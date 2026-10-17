import Joi from 'joi';
import { TICKET_STATUS_VALUES } from '../../constants/ticketStatus.js';
import { TICKET_CATEGORY_VALUES } from '../../constants/ticketCategory.js';
import { TICKET_PRIORITY_VALUES } from '../../constants/ticketPriority.js';
import { UNASSIGNED_ADMIN_FILTER } from '../../constants/adminTicketQuery.js';
import { AI_PROCESSING_STATUS_VALUES } from '../../constants/aiProcessingStatus.js';

const objectIdPattern = /^[a-f0-9]{24}$/;

export const adminTicketIdParamSchema = Joi.object({
  ticketId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'ticketId must be a valid ticket identifier',
    'string.length': 'ticketId must be a valid ticket identifier',
  }),
});

export const adminTicketQueueQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string()
    .valid(...TICKET_STATUS_VALUES)
    .optional(),
  category: Joi.string()
    .valid(...TICKET_CATEGORY_VALUES)
    .optional(),
  priority: Joi.string()
    .valid(...TICKET_PRIORITY_VALUES)
    .optional(),
  assignedTo: Joi.alternatives()
    .try(
      Joi.string().valid(UNASSIGNED_ADMIN_FILTER),
      Joi.string().pattern(objectIdPattern),
    )
    .optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
  search: Joi.string().trim().max(200).optional(),
  authorId: Joi.string().hex().length(24).optional().messages({
    'string.hex': 'authorId must be a valid author user identifier',
    'string.length': 'authorId must be a valid author user identifier',
  }),
  aiProcessingStatus: Joi.string()
    .valid(...AI_PROCESSING_STATUS_VALUES)
    .optional(),
})
  .custom((value, helpers) => {
    if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
      return helpers.message({ custom: 'dateFrom must be earlier than or equal to dateTo' });
    }

    return value;
  })
  .messages({
    'any.custom': 'dateFrom must be earlier than or equal to dateTo',
  });

export const adminTicketAssignmentSchema = Joi.object({
  assignedTo: Joi.alternatives()
    .try(Joi.string().hex().length(24), Joi.valid(null))
    .required(),
  status: Joi.forbidden(),
  category: Joi.forbidden(),
  priority: Joi.forbidden(),
  author: Joi.forbidden(),
  authorId: Joi.forbidden(),
  ticketNumber: Joi.forbidden(),
  aiCategory: Joi.forbidden(),
  aiPriority: Joi.forbidden(),
});

export const adminTicketStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...TICKET_STATUS_VALUES)
    .required(),
  category: Joi.forbidden(),
  priority: Joi.forbidden(),
  assignedTo: Joi.forbidden(),
  author: Joi.forbidden(),
  authorId: Joi.forbidden(),
  ticketNumber: Joi.forbidden(),
  aiCategory: Joi.forbidden(),
  aiPriority: Joi.forbidden(),
});

export const adminTicketClassificationSchema = Joi.object({
  category: Joi.string()
    .valid(...TICKET_CATEGORY_VALUES)
    .optional(),
  priority: Joi.string()
    .valid(...TICKET_PRIORITY_VALUES)
    .optional(),
  priorityOverrideReason: Joi.string().trim().max(500).optional().allow('', null),
  clearPriorityOverride: Joi.boolean().optional(),
  status: Joi.forbidden(),
  assignedTo: Joi.forbidden(),
  author: Joi.forbidden(),
  authorId: Joi.forbidden(),
  ticketNumber: Joi.forbidden(),
  aiCategory: Joi.forbidden(),
  aiPriority: Joi.forbidden(),
})
  .custom((value, helpers) => {
    if (value.clearPriorityOverride && value.priority !== undefined) {
      return helpers.message({
        custom: 'clearPriorityOverride cannot be combined with a priority update',
      });
    }

    return value;
  })
  .or('category', 'priority', 'clearPriorityOverride')
  .messages({
    'object.missing': 'At least one of category, priority, or clearPriorityOverride must be supplied',
    'any.custom': 'clearPriorityOverride cannot be combined with a priority update',
  });

export const adminMessageListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

export const adminPublicReplySchema = Joi.object({
  body: Joi.string().trim().min(1).max(10000).required(),
  senderId: Joi.forbidden(),
  senderRole: Joi.forbidden(),
  author: Joi.forbidden(),
  authorId: Joi.forbidden(),
  admin: Joi.forbidden(),
});

export const adminInternalNoteSchema = Joi.object({
  body: Joi.string().trim().min(1).max(5000).required(),
  admin: Joi.forbidden(),
  adminId: Joi.forbidden(),
  senderId: Joi.forbidden(),
  senderRole: Joi.forbidden(),
});

export default {
  adminTicketIdParamSchema,
  adminTicketQueueQuerySchema,
  adminTicketAssignmentSchema,
  adminTicketStatusSchema,
  adminTicketClassificationSchema,
  adminMessageListQuerySchema,
  adminPublicReplySchema,
  adminInternalNoteSchema,
};
