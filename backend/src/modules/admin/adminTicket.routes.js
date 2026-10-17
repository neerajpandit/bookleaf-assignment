import { Router } from 'express';
import authenticate from '../../middleware/authenticate.js';
import authorizeRoles from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import { ROLES } from '../../constants/roles.js';
import {
  adminTicketAssignmentSchema,
  adminTicketClassificationSchema,
  adminTicketIdParamSchema,
  adminTicketQueueQuerySchema,
  adminTicketStatusSchema,
  adminMessageListQuerySchema,
  adminPublicReplySchema,
  adminInternalNoteSchema,
} from './adminTicket.validation.js';
import {
  getAdminTicketQueue,
  getAdminTicketDetail,
  patchAdminTicketAssignment,
  patchAdminTicketClassification,
  patchAdminTicketStatus,
  getAdminTicketMessages,
  postAdminTicketMessage,
  getAdminInternalNotes,
  postAdminInternalNote,
  postAdminTicketAiDraft,
  downloadAdminTicketAttachment,
} from './adminTicket.controller.js';

const router = Router();

router.use(authenticate, authorizeRoles(ROLES.ADMIN));

router.get('/', validate(adminTicketQueueQuerySchema, 'query'), getAdminTicketQueue);

router.patch(
  '/:ticketId/assignment',
  validate(adminTicketIdParamSchema, 'params'),
  validate(adminTicketAssignmentSchema),
  patchAdminTicketAssignment,
);

router.patch(
  '/:ticketId/status',
  validate(adminTicketIdParamSchema, 'params'),
  validate(adminTicketStatusSchema),
  patchAdminTicketStatus,
);

router.patch(
  '/:ticketId/classification',
  validate(adminTicketIdParamSchema, 'params'),
  validate(adminTicketClassificationSchema),
  patchAdminTicketClassification,
);

router.get(
  '/:ticketId/messages',
  validate(adminTicketIdParamSchema, 'params'),
  validate(adminMessageListQuerySchema, 'query'),
  getAdminTicketMessages,
);

router.post(
  '/:ticketId/messages',
  validate(adminTicketIdParamSchema, 'params'),
  validate(adminPublicReplySchema),
  postAdminTicketMessage,
);

router.get(
  '/:ticketId/notes',
  validate(adminTicketIdParamSchema, 'params'),
  validate(adminMessageListQuerySchema, 'query'),
  getAdminInternalNotes,
);

router.post(
  '/:ticketId/notes',
  validate(adminTicketIdParamSchema, 'params'),
  validate(adminInternalNoteSchema),
  postAdminInternalNote,
);

router.get(
  '/:ticketId/attachment',
  validate(adminTicketIdParamSchema, 'params'),
  downloadAdminTicketAttachment,
);

router.get(
  '/:ticketId',
  validate(adminTicketIdParamSchema, 'params'),
  getAdminTicketDetail,
);

router.post(
  '/:ticketId/ai/draft',
  validate(adminTicketIdParamSchema, 'params'),
  postAdminTicketAiDraft,
);

export default router;
