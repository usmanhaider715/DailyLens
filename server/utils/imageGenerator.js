import { logger } from './logger.js';

export const DEFAULT_FEATURED_PLACEHOLDER =
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=630&fit=crop&q=80&auto=format';

/**
 * Build a Pollinations.ai URL for an AI-generated editorial hero image.
 * No API key required — image is rendered on first request.
 */
export function generateArticleImage(title, category) {
  const subject = String(title || 'Breaking news').trim().slice(0, 120);
  const cat = String(category || 'News').trim();
  const prompt = `photorealistic editorial photo of ${subject}, ${cat} news, high quality, 4k, professional journalism`;
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 1_000_000_000);
  return `https://image.pollinations.ai/prompt/${encoded}?width=1200&height=630&nologo=true&seed=${seed}`;
}

/**
 * Resolve featured image URL with safe fallback — never throws.
 */
export async function resolveFeaturedImageUrl(title, category) {
  try {
    const url = generateArticleImage(title, category);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
      });
      if (res.ok || res.status === 405 || res.status === 404) {
        return url;
      }
      throw new Error(`Pollinations responded with ${res.status}`);
    } catch (err) {
      if (err.name === 'AbortError') {
        logger.warn('Pollinations image check timed out — using generated URL', { title: subjectLabel(title) });
        return url;
      }
      logger.warn('Pollinations unavailable — using placeholder', {
        title: subjectLabel(title),
        error: err?.message,
      });
      return DEFAULT_FEATURED_PLACEHOLDER;
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    logger.error('Featured image generation failed', err?.message || err);
    return DEFAULT_FEATURED_PLACEHOLDER;
  }
}

function subjectLabel(title) {
  return String(title || '').slice(0, 60);
}
