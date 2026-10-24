import { Router } from 'express';
import healthRoutes from './health.routes.js';
import demoRoutes from './demo.routes.js';
import { authRouter } from '../modules/auth/index.js';
import { bookRouter } from '../modules/books/index.js';
import { ticketRouter } from '../modules/tickets/index.js';
import {
  adminAuthorRouter,
  adminDashboardRouter,
  adminTicketRouter,
} from '../modules/admin/index.js';
import { loadConfig } from '../config/index.js';
import { validateCsrfForMutations } from '../middleware/csrf.js';

const router = Router();

// router.use(validateCsrfForMutations);
router.use(healthRoutes);
router.use('/auth', authRouter);
router.use('/books', bookRouter);
router.use('/tickets', ticketRouter);
router.use('/admin/authors', adminAuthorRouter);
router.use('/admin/dashboard', adminDashboardRouter);
router.use('/admin/tickets', adminTicketRouter);

const { nodeEnv } = loadConfig();

if (nodeEnv !== 'production') {
  router.use('/demo', demoRoutes);
}

export default router;
