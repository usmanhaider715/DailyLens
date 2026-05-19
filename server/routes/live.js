import { Router } from 'express';
import * as live from '../controllers/liveController.js';

const router = Router();
router.get('/scores', live.getScores);
router.get('/sports', live.liveSports);
export default router;
