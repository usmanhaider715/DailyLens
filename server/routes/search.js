import { Router } from 'express';
import * as sc from '../controllers/searchController.js';

const router = Router();
router.get('/', sc.searchArticles);
router.get('/suggest', sc.suggestArticles);
export default router;
