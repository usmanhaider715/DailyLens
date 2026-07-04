const DRAFT_KEY = 'dailylens-admin-draft';

export function saveAdminDraft(draft, meta = {}) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, meta, savedAt: Date.now() }));
}

export function loadAdminDraft() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(DRAFT_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function draftToPublishPayload(draft, meta = {}) {
  return {
    title: draft.title,
    summary: draft.summary,
    body: draft.body,
    category: draft.category,
    tags: draft.tags || [],
    author: 'The Daily Lens Desk',
    heroImage: draft.heroImageUrl
      ? {
          url: draft.heroImageUrl,
          alt: draft.heroImageAlt || draft.title,
          credit: draft.heroImageCredit || meta.sourceName || '',
          creditUrl: draft.heroImageCreditUrl || meta.sourceUrl || '',
          source: draft.heroImageSource || 'original',
        }
      : undefined,
    isPublished: true,
    seoScore: draft.seoScore ?? 7,
    readTime: draft.readTime,
    isBreaking: !!draft.isBreaking,
    originalUrl: meta.sourceUrl || draft.originalUrl,
    originalTitle: meta.originalTitle || draft.originalTitle,
    source: meta.sourceName
      ? { name: meta.sourceName, url: meta.sourceUrl || '' }
      : undefined,
    publishedAt: meta.publishedAt || new Date().toISOString(),
  };
}

export function draftToEditorForm(draft) {
  return {
    title: draft.title || '',
    summary: draft.summary || '',
    body: draft.body || '',
    category: draft.category || 'World',
    tags: (draft.tags || []).join(', '),
    heroImageUrl: draft.heroImageUrl || '',
    heroImageAlt: draft.heroImageAlt || draft.title || '',
    heroImageCredit: draft.heroImageCredit || '',
    heroImageCreditUrl: draft.heroImageCreditUrl || '',
    isBreaking: !!draft.isBreaking,
    seoScore: draft.seoScore ?? 7,
    readTime: draft.readTime,
  };
}
