import { fetchLatestNewsFeedForAdmin } from '../services/newsService.js';
import { generateSeoArticle } from '../services/groqService.js';
import { resolveHeroImage, buildHeroCaption } from '../services/imageDiscoveryService.js';
import {
  assembleArticleBody,
  buildArticleFooterHtml,
  buildArticleFollowUpHtml,
} from '../utils/articleBodyFormat.js';

export async function getAiNewsFeed(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 150);
    const category = (req.query.category || '').trim();
    const feed = await fetchLatestNewsFeedForAdmin(limit, {
      category: category && category !== 'All' ? category : undefined,
    });
    res.json({
      items: feed.items,
      categories: feed.categories,
      activeCategory: feed.activeCategory,
      totalInCategory: feed.totalInCategory,
      count: feed.items.length,
    });
  } catch (err) {
    next(err);
  }
}

export async function generateArticleFromStory(req, res, next) {
  try {
    const { title, description, content, url, imageUrl, sourceName, sourceUrl, publishedAt, suggestedCategory } =
      req.body || {};

    if (!title || !url) {
      return res.status(400).json({ message: 'title and url are required' });
    }

    const raw = {
      title,
      description: description || '',
      content: content || description || '',
      url,
      imageUrl: imageUrl || '',
      sourceName: sourceName || 'News source',
      sourceUrl: sourceUrl || url,
      publishedAt: publishedAt || new Date().toISOString(),
      suggestedCategory,
    };

    const [article, hero] = await Promise.all([
      generateSeoArticle(raw),
      resolveHeroImage({
        title: raw.title,
        imageUrl: raw.imageUrl,
        url: raw.url,
        sourceName: raw.sourceName,
        sourceUrl: raw.sourceUrl,
      }),
    ]);

    const followUpHtml = buildArticleFollowUpHtml(article.followUpLinks);
    const footerHtml = buildArticleFooterHtml({
      sourceName: raw.sourceName,
      sourceUrl: raw.sourceUrl,
      hero,
    });
    const bodyWithCredits = assembleArticleBody(article.body, { followUpHtml, footerHtml });
    const heroCaption = hero ? buildHeroCaption(hero) : '';

    res.json({
      title: article.headline,
      summary: article.summary,
      body: bodyWithCredits,
      category: article.category || suggestedCategory || 'World',
      tags: article.tags || [],
      primaryKeyword: article.primaryKeyword || '',
      seoScore: article.seoScore,
      readTime: article.readTime,
      isBreaking: !!article.isBreaking,
      heroImageUrl: hero?.url || '',
      heroImageAlt: article.heroImageAlt || heroCaption || article.headline,
      heroImageCredit: hero?.credit || raw.sourceName,
      heroImageCreditUrl: hero?.creditUrl || raw.sourceUrl,
      heroImageSource: hero?.source || 'original',
      sourceAttribution: article.sourceAttribution,
    });
  } catch (err) {
    const msg =
      err?.response?.data?.error?.message || err.message || 'AI generation failed';
    if (err?.response?.status === 429) {
      return res.status(429).json({
        message: 'Groq rate limit reached. Wait a moment and try again.',
      });
    }
    if (err?.response?.status === 401) {
      return res.status(500).json({
        message: 'Invalid GROQ_API_KEY. Check server .env configuration.',
      });
    }
    next(new Error(msg));
  }
}
