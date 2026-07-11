import { generateSeoArticle } from './groqService.js';
import { resolveHeroImage, buildHeroCaption } from './imageDiscoveryService.js';
import { persistFeaturedImageIfRemote } from '../utils/persistHeroImage.js';

export async function buildAiDraftResponse(raw, suggestedCategory) {
  const article = await generateSeoArticle(raw);
  const category = article.category || suggestedCategory || 'World';

  const hero = await resolveHeroImage({
    title: article.headline,
    category,
    primaryKeyword: article.primaryKeyword,
    tags: article.tags,
  });
  const heroCaption = hero?.url ? buildHeroCaption(hero) : '';

  let featuredImage = hero?.url || '';
  if (featuredImage) {
    try {
      featuredImage = await persistFeaturedImageIfRemote(featuredImage, article.headline);
    } catch {
      /* use remote licensed URL */
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
    heroImageUrl: featuredImage || hero?.url || '',
    heroImageAlt: article.heroImageAlt || heroCaption || article.headline,
    heroImageCredit: hero?.credit || '',
    heroImageCreditUrl: hero?.creditUrl || '',
    heroImageSource: hero?.source || 'ai_generated',
    heroImageLicense: hero?.license || null,
    imageSourceType: hero?.source || 'ai_generated',
    imageAttribution: hero?.imageAttribution || hero?.credit || '',
    verifiedQuotes: !!article.verifiedQuotes,
    rewriteModel: article.rewriteModel || '',
    sourceAttribution: {
      sourceName: raw.sourceName,
      sourceUrl: raw.sourceUrl || raw.url,
    },
    originalUrl: raw.url,
    originalTitle: raw.title,
  };
}
