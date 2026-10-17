import { Router } from 'express';
import validate from '../../middleware/validate.js';
import authenticate from '../../middleware/authenticate.js';
import authorizeRoles from '../../middleware/authorize.js';
import { validateCsrf } from '../../middleware/csrf.js';
import { loginRateLimiter } from '../../middleware/loginRateLimiter.js';
import { ROLES } from '../../constants/roles.js';
import { registerSchema, loginSchema } from './auth.validation.js';
import { loadConfig } from '../../config/index.js';
import {
  getCsrfToken,
  register,
  login,
  me,
  logout,
  adminOnlyTest,
} from './auth.controller.js';

const router = Router();
const { nodeEnv } = loadConfig();

router.get('/csrf-token', getCsrfToken);

router.post('/register', validateCsrf, validate(registerSchema), register);
router.post('/login', validateCsrf, loginRateLimiter, validate(loginSchema), login);
router.get('/me', authenticate, me);
router.post('/logout', validateCsrf, authenticate, logout);

if (nodeEnv !== 'production') {
  router.get('/test/admin-only', authenticate, authorizeRoles(ROLES.ADMIN), adminOnlyTest);
}

export default router;
