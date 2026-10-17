import Joi from 'joi';

export const adminDashboardTicketSectionsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(20).default(5),
});

export default {
  adminDashboardTicketSectionsQuerySchema,
};
