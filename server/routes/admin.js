import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as admin from '../controllers/adminController.js';
import * as adminAi from '../controllers/adminAiController.js';

const router = Router();

router.use(requireAuth);

router.get('/ads', admin.listAds);
router.post('/ads', admin.createAd);
router.put('/ads/:id', admin.updateAd);

router.get('/articles', admin.listAdminArticles);
router.post('/articles', admin.createArticle);
router.get('/articles/:id', admin.getAdminArticle);
router.put('/articles/:id', admin.updateArticle);
router.post('/articles/bulk-delete', admin.bulkDelete);
router.post('/articles/:id/feature', admin.setFeatured);
router.post('/articles/:id/breaking', admin.setBreaking);
router.post('/articles/:id/pause', admin.setPaused);
router.delete('/articles/:id', admin.deleteArticle);
router.post('/fetch-url', admin.manualFetchUrl);
router.post('/breaking-push', admin.breakingPush);
router.get('/analytics', admin.adminAnalytics);
router.get('/settings', admin.getSettings);
router.put('/settings', admin.updateSettings);

router.get('/ai/news-feed', adminAi.getAiNewsFeed);
router.post('/ai/generate-article', adminAi.generateArticleFromStory);

export default router;
