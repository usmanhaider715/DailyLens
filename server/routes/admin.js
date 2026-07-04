import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import * as admin from '../controllers/adminController.js';
import * as adminAi from '../controllers/adminAiController.js';
import { adminAiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(requireAdmin);

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

router.get('/ai/news-feed', adminAiLimiter, adminAi.getAiNewsFeed);
router.get('/ai/search-hero-images', adminAiLimiter, adminAi.searchHeroImages);
router.get('/ai/google-trends', adminAiLimiter, adminAi.getGoogleTrends);
router.get('/ai/google-news/24h', adminAiLimiter, adminAi.getGoogleNews24h);
router.get('/ai/google-news/search', adminAiLimiter, adminAi.searchGoogleNewsAdmin);
router.post('/ai/generate-article', adminAiLimiter, adminAi.generateArticleFromStory);
router.post('/ai/generate-from-rough-text', adminAiLimiter, adminAi.generateArticleFromRoughText);
router.post('/ai/generate-from-trend', adminAiLimiter, adminAi.generateArticleFromTrend);

export default router;
