import { Router } from 'express';
import { contactLimiter } from '../middleware/rateLimiter.js';
import * as contact from '../controllers/contactController.js';

const router = Router();

router.post('/', contactLimiter, contact.submitContact);

export default router;
