import { Router } from 'express';
import * as images from '../controllers/imageController.js';
import { imageProxyLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/proxy', imageProxyLimiter, images.proxyHeroImage);

export default router;
