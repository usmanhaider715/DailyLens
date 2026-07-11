import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import * as admin from '../controllers/adminController.js';
import * as adminAi from '../controllers/adminAiController.js';
import * as images from '../controllers/imageController.js';
import { adminAiLimiter, batchPublishLimiter } from '../middleware/rateLimiter.js';
import { heroUploadMiddleware } from '../middleware/uploadHero.js';
import * as autoShare from '../controllers/autoShareController.js';
import * as ideaBatch from '../controllers/ideaBatchController.js';
import * as evergreen from '../controllers/evergreenController.js';

const router = Router();

router.use(requireAdmin);

router.post('/upload-hero-image', (req, res, next) => {
  heroUploadMiddleware(req, res, (err) => {
    if (err) {
      const status = err.status || 400;
      return res.status(status).json({ message: err.message || 'Upload failed' });
    }
    images.uploadHeroImage(req, res, next);
  });
});

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
router.post('/articles/:id/evergreen', admin.setEvergreen);
router.delete('/articles/:id', admin.deleteArticle);
router.post('/fetch-url', admin.manualFetchUrl);
router.post('/breaking-push', admin.breakingPush);
router.get('/analytics', admin.adminAnalytics);
router.get('/settings', admin.getSettings);
router.put('/settings', admin.updateSettings);

router.get('/auto-share', autoShare.getAutoShare);
router.put('/auto-share', autoShare.putAutoShare);
router.post('/auto-share/run/:periodId', autoShare.triggerAutoSharePeriod);
router.get('/auto-share/run-status/:jobId', autoShare.getAutoShareRunStatus);
router.post('/auto-share/run-status/:jobId/control', autoShare.postAutoShareRunControl);
router.post('/auto-share/run/:jobId/control', autoShare.postAutoShareRunControl);
router.get('/auto-share/active-job', autoShare.getAutoShareActiveJob);

router.get('/idea-batch', ideaBatch.getIdeaBatch);
router.post('/idea-batch/start', ideaBatch.postIdeaBatchStart);
router.get('/idea-batch/run-status/:jobId', ideaBatch.getIdeaBatchRunStatus);
router.post('/idea-batch/run-status/:jobId/control', ideaBatch.postIdeaBatchRunControl);
router.get('/idea-batch/active-job', ideaBatch.getIdeaBatchActiveJob);
router.get('/idea-batch/drafts', ideaBatch.getIdeaDrafts);
router.post('/idea-batch/drafts/publish', ideaBatch.postBulkPublishDrafts);
router.post('/idea-batch/drafts/delete', ideaBatch.postBulkDeleteDrafts);

router.get('/evergreen', evergreen.getEvergreenSettings);
router.put('/evergreen', evergreen.putEvergreenSettings);
router.post('/evergreen/run', batchPublishLimiter, evergreen.postEvergreenRun);
router.get('/evergreen/pending', evergreen.getEvergreenPending);
router.post('/evergreen/pending/:id/approve', evergreen.postEvergreenApprove);
router.post('/evergreen/pending/:id/reject', evergreen.postEvergreenReject);
router.get('/evergreen/logs', evergreen.getEvergreenLogs);

router.get('/ai/news-feed', adminAiLimiter, adminAi.getAiNewsFeed);
router.get('/ai/search-hero-images', adminAiLimiter, adminAi.searchHeroImages);
router.get('/ai/google-trends', adminAiLimiter, adminAi.getGoogleTrends);
router.get('/ai/google-news/24h', adminAiLimiter, adminAi.getGoogleNews24h);
router.get('/ai/google-news/search', adminAiLimiter, adminAi.searchGoogleNewsAdmin);
router.post('/ai/generate-featured-image', adminAiLimiter, adminAi.generateFeaturedImage);
router.post('/ai/persist-featured-image', adminAiLimiter, adminAi.persistFeaturedImage);
router.post('/ai/generate-article', adminAiLimiter, adminAi.generateArticleFromStory);
router.post('/ai/generate-from-rough-text', adminAiLimiter, adminAi.generateArticleFromRoughText);
router.post('/ai/generate-from-trend', adminAiLimiter, adminAi.generateArticleFromTrend);
router.post('/ai/batch-publish', batchPublishLimiter, adminAi.startBatchPublish);
router.get('/ai/batch-publish/:jobId', adminAi.getBatchPublishStatus);

export default router;
