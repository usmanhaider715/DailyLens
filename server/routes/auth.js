import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();
router.post('/login', authLimiter, auth.login);
export default router;
