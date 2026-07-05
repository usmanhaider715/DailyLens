import { generateSeoArticle } from './groqService.js';
import { resolveHeroImage, buildHeroCaption } from './imageDiscoveryService.js';
import { resolveFeaturedImageUrl } from '../utils/imageGenerator.js';
import { isSourceNewsHero } from '../utils/heroPriority.js';

export async function buildAiDraftResponse(raw, suggestedCategory) {
  const article = await generateSeoArticle(raw);
  const category = article.category || suggestedCategory || 'World';

  const hero = await resolveHeroImage({
    title: article.headline,
    imageUrl: raw.imageUrl,
    url: raw.url,
    sourceName: raw.sourceName,
    sourceUrl: raw.sourceUrl,
    category: article.category || suggestedCategory,
    primaryKeyword: article.primaryKeyword,
  });
  const heroCaption = hero ? buildHeroCaption(hero) : '';

  let featuredImage = '';
  if (!isSourceNewsHero(hero)) {
    try {
      featuredImage = await resolveFeaturedImageUrl(article.headline, category);
    } catch {
      /* non-blocking */
    }
  }

  return {
    title: article.headline,
    summary: article.summary,
    body: article.body,
    category: article.category || suggestedCategory || 'World',
    tags: article.tags || [],
    featuredImage,
    primaryKeyword: article.primaryKeyword || '',
    seoScore: article.seoScore,
    geoScore: article.geoScore,
    readTime: article.readTime,
    isBreaking: !!article.isBreaking,
    heroImageUrl: hero?.url || '',
    heroImageAlt: article.heroImageAlt || heroCaption || article.headline,
    heroImageCredit: hero?.credit || raw.sourceName,
    heroImageCreditUrl: hero?.creditUrl || raw.sourceUrl,
    heroImageSource: hero?.source || 'original',
    heroImageLicense: hero?.license || null,
    sourceAttribution: {
      sourceName: raw.sourceName,
      sourceUrl: raw.sourceUrl || raw.url,
    },
    originalUrl: raw.url,
    originalTitle: raw.title,
  };
}
