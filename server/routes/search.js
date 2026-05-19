import { Router } from 'express';
import * as sc from '../controllers/searchController.js';

const router = Router();
router.get('/', sc.searchArticles);
export default router;
