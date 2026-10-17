import { Router } from 'express';
import authenticate from '../../middleware/authenticate.js';
import authorizeRoles from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import { ROLES } from '../../constants/roles.js';
import {
  adminAuthorBooksQuerySchema,
  adminAuthorDirectoryQuerySchema,
  adminAuthorUserIdParamSchema,
} from './adminAuthor.validation.js';
import {
  getAdminAuthorBooks,
  getAdminAuthorDetail,
  getAdminAuthorDirectory,
  getAdminAuthorRoyaltySummaryHandler,
} from './adminAuthor.controller.js';

const router = Router();

router.use(authenticate, authorizeRoles(ROLES.ADMIN));

router.get('/', validate(adminAuthorDirectoryQuerySchema, 'query'), getAdminAuthorDirectory);

router.get(
  '/:authorUserId/books',
  validate(adminAuthorUserIdParamSchema, 'params'),
  validate(adminAuthorBooksQuerySchema, 'query'),
  getAdminAuthorBooks,
);

router.get(
  '/:authorUserId/royalty-summary',
  validate(adminAuthorUserIdParamSchema, 'params'),
  getAdminAuthorRoyaltySummaryHandler,
);

router.get(
  '/:authorUserId',
  validate(adminAuthorUserIdParamSchema, 'params'),
  getAdminAuthorDetail,
);

export default router;
