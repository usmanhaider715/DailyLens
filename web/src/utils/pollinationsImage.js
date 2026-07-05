/** Client-side Pollinations URL builder (matches server imageGenerator.js). */
export function buildPollinationsFeaturedUrl(title, category) {
  const subject = String(title || 'Breaking news').trim().slice(0, 120);
  const cat = String(category || 'News').trim();
  const prompt = `photorealistic editorial photo of ${subject}, ${cat} news, high quality, 4k, professional journalism`;
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 1_000_000_000);
  return `https://image.pollinations.ai/prompt/${encoded}?width=1200&height=630&nologo=true&seed=${seed}`;
}

export function isPollinationsUrl(url) {
  return /pollinations\.ai/i.test(String(url || ''));
}
