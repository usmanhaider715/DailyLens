export function unsplashHeroUrl(category = 'news') {
  const c = encodeURIComponent(String(category || 'news').toLowerCase());
  return `https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=630&fit=crop&q=80&auto=format&ixlib=rb-4.0.3`;
}

export function isUploadedHeroUrl(url) {
  return /\/uploads\/heroes\/[^/?#]+\.webp$/i.test(String(url || '').trim());
}

export function isUsableImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const raw = url.trim();
  if (raw.startsWith('/uploads/heroes/')) {
    return !isRejectedHeroImageUrl(raw);
  }
  try {
    const u = new URL(raw);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    if (u.pathname.endsWith('.svg')) return false;
    return !isRejectedHeroImageUrl(raw);
  } catch {
    return false;
  }
}

/** Block Google News favicons, logos, and other non-story hero images. */
export function isRejectedHeroImageUrl(url) {
  const raw = String(url || '').trim().toLowerCase();
  if (!raw) return true;

  const blockedHosts = [
    'googleusercontent.com',
    'gstatic.com',
    'google.com',
    'google.co.uk',
    'news.google.com',
    't0.gstatic.com',
    't1.gstatic.com',
    't2.gstatic.com',
    't3.gstatic.com',
  ];
  if (blockedHosts.some((h) => raw.includes(h))) return true;

  const blockedFragments = [
    '/favicon',
    'favicon.ico',
    '/logo',
    'logo.png',
    'logo.jpg',
    '/icon',
    'branding',
    'productlogos',
    'google_news',
    'google-news',
    'multicolor',
  ];
  if (blockedFragments.some((f) => raw.includes(f))) return true;

  return false;
}

export function normalizeHeroImage(hero, category = 'World') {
  const url = hero?.url?.trim() || '';
  const isUpload = hero?.source === 'upload' || isUploadedHeroUrl(url);

  if (isUpload && url) {
    return {
      url,
      alt: hero?.alt || 'News image',
      credit: hero?.credit || 'Uploaded image',
      creditUrl: hero?.creditUrl || '',
      source: 'upload',
      uploadFilename: hero?.uploadFilename || url.split('/').pop()?.split('?')[0] || '',
      viaGoogle: false,
    };
  }

  if (isUsableImageUrl(url)) {
    return {
      url,
      alt: hero?.alt || 'News image',
      credit: hero?.credit || '',
      creditUrl: hero?.creditUrl || '',
      source: hero?.source || 'original',
      uploadFilename: hero?.uploadFilename || '',
      viaGoogle: !!hero?.viaGoogle,
    };
  }
  return {
    url: unsplashHeroUrl(category),
    alt: hero?.alt || 'News image',
    credit: 'Unsplash',
    creditUrl: 'https://unsplash.com',
    source: 'placeholder',
    uploadFilename: '',
    viaGoogle: false,
  };
}
