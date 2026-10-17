import { Router } from 'express';
import authenticate from '../../middleware/authenticate.js';
import authorizeRoles from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import { ROLES } from '../../constants/roles.js';
import { listBooksQuerySchema, bookIdParamSchema } from './book.validation.js';
import { listBooks, getBook } from './book.controller.js';

const router = Router();

router.get(
  '/',
  authenticate,
  authorizeRoles(ROLES.AUTHOR),
  validate(listBooksQuerySchema, 'query'),
  listBooks,
);

router.get(
  '/:bookId',
  authenticate,
  authorizeRoles(ROLES.AUTHOR),
  validate(bookIdParamSchema, 'params'),
  getBook,
);

export default router;
