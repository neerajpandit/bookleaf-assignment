import { Router } from 'express';
import authenticate from '../../middleware/authenticate.js';
import authorizeRoles from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import { ROLES } from '../../constants/roles.js';
import { adminDashboardTicketSectionsQuerySchema } from './adminDashboard.validation.js';
import { getAdminDashboardTicketSectionsHandler } from './adminDashboard.controller.js';

const router = Router();

router.use(authenticate, authorizeRoles(ROLES.ADMIN));

router.get(
  '/ticket-sections',
  validate(adminDashboardTicketSectionsQuerySchema, 'query'),
  getAdminDashboardTicketSectionsHandler,
);

export default router;
