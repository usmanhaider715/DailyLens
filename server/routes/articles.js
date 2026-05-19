import { Router } from 'express';
import * as ac from '../controllers/articleController.js';

const router = Router();

router.get('/forecasts', ac.getForecasts);
router.get('/breaking', ac.getBreaking);
router.get('/trending', ac.getTrending);
router.get('/featured', ac.getFeatured);
router.get('/:slug', ac.getArticleBySlug);
router.get('/', ac.listArticles);

export default router;
