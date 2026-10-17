import { Router } from 'express';
import authenticate from '../../middleware/authenticate.js';
import authorizeRoles from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import { ROLES } from '../../constants/roles.js';
import {
  createTicketSchema,
  listTicketsQuerySchema,
  ticketIdParamSchema,
  createTicketMessageSchema,
} from './ticket.validation.js';
import { handleTicketAttachmentUpload } from '../../middleware/ticketAttachmentUpload.js';
import {
  addTicketMessage,
  createTicket,
  downloadTicketAttachment,
  getTicket,
  listTickets,
} from './ticket.controller.js';

const router = Router();

router.get(
  '/',
  authenticate,
  authorizeRoles(ROLES.AUTHOR),
  validate(listTicketsQuerySchema, 'query'),
  listTickets,
);

router.post(
  '/',
  authenticate,
  authorizeRoles(ROLES.AUTHOR),
  handleTicketAttachmentUpload,
  validate(createTicketSchema),
  createTicket,
);

router.get(
  '/:ticketId/attachment',
  authenticate,
  authorizeRoles(ROLES.AUTHOR),
  validate(ticketIdParamSchema, 'params'),
  downloadTicketAttachment,
);

router.get(
  '/:ticketId',
  authenticate,
  authorizeRoles(ROLES.AUTHOR),
  validate(ticketIdParamSchema, 'params'),
  getTicket,
);

router.post(
  '/:ticketId/messages',
  authenticate,
  authorizeRoles(ROLES.AUTHOR),
  validate(ticketIdParamSchema, 'params'),
  validate(createTicketMessageSchema),
  addTicketMessage,
);

export default router;
