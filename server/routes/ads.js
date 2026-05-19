import { Router } from 'express';
import * as ads from '../controllers/adController.js';

const router = Router();

router.post('/:id/impression', ads.trackImpression);
router.post('/:id/click', ads.trackClick);
router.get('/:position', ads.getAdByPosition);

export default router;
