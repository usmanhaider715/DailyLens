import { getTopicHub, listTopicHubs } from '../services/topicHubService.js';
import { cacheGet, cacheSet } from '../services/cacheService.js';
import { normalizeHeroImage } from '../utils/heroImageUtils.js';
import { sanitizeReadTimeMinutes } from '../utils/seoArticleNormalize.js';

function enrich(article) {
  if (!article) return article;
  return {
    ...article,
    heroImage: normalizeHeroImage(article.heroImage, article.category),
    readTime: sanitizeReadTimeMinutes(article.readTime, article.summary),
  };
}

function enrichHub(data) {
  if (!data) return data;
  const map = (arr) => (Array.isArray(arr) ? arr.map(enrich) : []);
  return {
    ...data,
    latest: map(data.latest),
    trending: map(data.trending),
    news: map(data.news),
    guides: map(data.guides),
  };
}

export async function listTopics(req, res, next) {
  try {
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ topics: listTopicHubs() });
  } catch (e) {
    next(e);
  }
}

export async function getTopic(req, res, next) {
  try {
    const slug = String(req.params.slug || '').toLowerCase();
    const ck = `topics:hub:${slug}`;
    const cached = await cacheGet(ck);
    if (cached) {
      res.set('Cache-Control', 'public, max-age=300');
      return res.json(enrichHub(cached));
    }

    const data = await getTopicHub(slug);
    if (!data) return res.status(404).json({ message: 'Topic not found' });

    await cacheSet(ck, data, 300);
    res.set('Cache-Control', 'public, max-age=300');
    res.json(enrichHub(data));
  } catch (e) {
    next(e);
  }
}
