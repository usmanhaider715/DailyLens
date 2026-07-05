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
  return generateArticleImage(title, category);
}
