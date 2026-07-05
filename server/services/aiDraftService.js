import { generateSeoArticle } from './groqService.js';
import { resolveHeroImage, buildHeroCaption } from './imageDiscoveryService.js';

export async function buildAiDraftResponse(raw, suggestedCategory) {
  const article = await generateSeoArticle(raw);
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

  return {
    title: article.headline,
    summary: article.summary,
    body: article.body,
    category: article.category || suggestedCategory || 'World',
    tags: article.tags || [],
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
