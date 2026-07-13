import { Article } from '../models/Article.js';
import { publicArticleFilter } from '../utils/publicArticleFilter.js';
import { computeContentHealth } from './contentHealthService.js';

/**
 * Existing-content analysis (Section 7), internal-link mapping (Section 12)
 * and refresh candidates (Section 11). All computed from the live corpus.
 */

const AUDIT_PROJECTION = {
  title: 1,
  slug: 1,
  category: 1,
  tags: 1,
  targetKeyword: 1,
  summary: 1,
  body: 1,
  faq: 1,
  heroImage: 1,
  featuredImage: 1,
  contentType: 1,
  isEvergreen: 1,
  views: 1,
  qualityScore: 1,
  qualityFlags: 1,
  engagement: 1,
  publishedAt: 1,
  updatedAt: 1,
};

const REFRESH_AGE_DAYS = Number(process.env.EVERGREEN_REFRESH_DAYS) || 180;

const stripHtml = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const wordCount = (html) => (stripHtml(html).match(/\S+/g) || []).length;
const ageDays = (d) => (Date.now() - new Date(d || 0).getTime()) / 86400000;
const norm = (s) => String(s || '').trim().toLowerCase();

function tokenize(text) {
  return new Set(
    norm(text)
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}

function titleSimilarity(a, b) {
  const A = tokenize(a);
  const B = tokenize(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter += 1;
  return inter / (A.size + B.size - inter);
}

export async function getContentAudit() {
  const articles = await Article.find(publicArticleFilter, AUDIT_PROJECTION).lean();

  const thin = [];
  const old = [];
  const missingImages = [];
  const missingFaqs = [];
  const missingSchema = [];
  const weakTitles = [];
  const weakMeta = [];
  const lowTraffic = [];
  const duplicates = [];
  const orphans = [];
  const weakLinking = [];

  // Tag connectivity graph for orphan / weak-linking detection.
  const tagOwners = new Map();
  for (const a of articles) {
    for (const t of [...(a.tags || []), a.targetKeyword].filter(Boolean)) {
      const k = norm(t);
      if (!tagOwners.has(k)) tagOwners.set(k, []);
      tagOwners.get(k).push(a.slug);
    }
  }

  for (const a of articles) {
    const wc = wordCount(a.body);
    const isGuide = a.contentType === 'evergreen' || a.isEvergreen;
    const minWords = isGuide ? 700 : 300;
    const hero = a.featuredImage || a.heroImage?.url;

    if (wc < minWords) thin.push({ title: a.title, slug: a.slug, words: wc, min: minWords });
    if (isGuide && ageDays(a.updatedAt) > REFRESH_AGE_DAYS) {
      old.push({ title: a.title, slug: a.slug, ageDays: Math.round(ageDays(a.updatedAt)) });
    }
    if (!hero) missingImages.push({ title: a.title, slug: a.slug });
    if (isGuide && !(a.faq || []).length) missingFaqs.push({ title: a.title, slug: a.slug });
    // Article/NewsArticle JSON-LD is emitted for every page; FAQ schema is the
    // one that's conditionally missing when there's no faq block.
    if (isGuide && !(a.faq || []).length) missingSchema.push({ title: a.title, slug: a.slug, schema: 'FAQPage' });

    const tlen = (a.title || '').length;
    if (tlen < 25 || tlen > 70) weakTitles.push({ title: a.title, slug: a.slug, length: tlen });

    const mlen = (a.summary || '').length;
    if (mlen < 70 || mlen > 165) weakMeta.push({ title: a.title, slug: a.slug, length: mlen });

    const perMonth = (a.views || 0) / Math.max(1, ageDays(a.publishedAt) / 30);
    if (ageDays(a.publishedAt) > 45 && perMonth < 3) {
      lowTraffic.push({ title: a.title, slug: a.slug, views: a.views || 0 });
    }

    // Orphan / weak internal linking: how many other articles share a tag.
    const neighbors = new Set();
    for (const t of [...(a.tags || []), a.targetKeyword].filter(Boolean)) {
      for (const s of tagOwners.get(norm(t)) || []) if (s !== a.slug) neighbors.add(s);
    }
    if (neighbors.size === 0) orphans.push({ title: a.title, slug: a.slug });
    else if (neighbors.size < 2) weakLinking.push({ title: a.title, slug: a.slug, related: neighbors.size });
  }

  // Duplicate topics: near-identical titles (Jaccard ≥ 0.6) within a category.
  const seen = new Set();
  for (let i = 0; i < articles.length; i++) {
    for (let j = i + 1; j < articles.length; j++) {
      if (articles[i].category !== articles[j].category) continue;
      const key = `${i}-${j}`;
      if (seen.has(key)) continue;
      if (titleSimilarity(articles[i].title, articles[j].title) >= 0.6) {
        seen.add(key);
        duplicates.push({
          a: { title: articles[i].title, slug: articles[i].slug },
          b: { title: articles[j].title, slug: articles[j].slug },
          category: articles[i].category,
        });
      }
    }
  }

  const recommendations = [];
  if (thin.length) recommendations.push(`Expand ${thin.length} thin article(s) to meet depth thresholds.`);
  if (old.length) recommendations.push(`Refresh ${old.length} guide(s) older than ${REFRESH_AGE_DAYS} days.`);
  if (missingImages.length) recommendations.push(`Add hero images to ${missingImages.length} article(s).`);
  if (missingFaqs.length) recommendations.push(`Add FAQ blocks (and FAQ schema) to ${missingFaqs.length} guide(s).`);
  if (weakTitles.length) recommendations.push(`Rewrite ${weakTitles.length} title(s) outside the 25–70 char sweet spot.`);
  if (weakMeta.length) recommendations.push(`Tighten ${weakMeta.length} meta description(s) to 70–165 chars.`);
  if (orphans.length) recommendations.push(`Interlink ${orphans.length} orphan page(s) into a cluster.`);
  if (duplicates.length) recommendations.push(`Review ${duplicates.length} possible duplicate topic pair(s) for consolidation.`);

  const summarize = (arr) => ({ count: arr.length, items: arr.slice(0, 50) });

  return {
    totalAnalyzed: articles.length,
    duplicateTopics: summarize(duplicates),
    thinArticles: summarize(thin),
    oldArticles: summarize(old),
    weakInternalLinking: summarize(weakLinking),
    missingImages: summarize(missingImages),
    missingSchema: summarize(missingSchema),
    missingFaqs: summarize(missingFaqs),
    weakTitles: summarize(weakTitles),
    weakMetaDescriptions: summarize(weakMeta),
    orphanPages: summarize(orphans),
    lowTrafficPages: summarize(lowTraffic),
    brokenLinks: { count: 0, note: 'Broken-link scanning runs on demand (requires outbound crawl).' },
    recommendations,
  };
}

/** Refresh center (Section 11): guides that should be refreshed, worst first. */
export async function getRefreshCandidates({ limit = 100 } = {}) {
  const articles = await Article.find(
    { ...publicArticleFilter, $or: [{ contentType: 'evergreen' }, { isEvergreen: true }] },
    AUDIT_PROJECTION,
  ).lean();

  const items = articles
    .map((a) => {
      const health = computeContentHealth(a);
      return {
        title: a.title,
        slug: a.slug,
        category: a.category,
        views: a.views || 0,
        ageDays: Math.round(ageDays(a.updatedAt)),
        publishedAt: a.publishedAt,
        updatedAt: a.updatedAt,
        ...health,
        flags: {
          olderThan6Months: ageDays(a.updatedAt) > 180,
          missingFaq: !(a.faq || []).length,
          missingSchema: !(a.faq || []).length,
          lowTraffic: health.reasons.some((r) => r.toLowerCase().includes('traffic')),
        },
      };
    })
    .filter((a) => a.needsRefresh || a.flags.olderThan6Months || a.flags.missingFaq)
    .sort((a, b) => a.health - b.health)
    .slice(0, limit);

  return { total: items.length, items };
}

/** Internal-link map for a single article (Section 12). */
export async function getInternalLinkMap(slug) {
  const article = await Article.findOne({ slug }, AUDIT_PROJECTION).lean();
  if (!article) return null;

  const others = await Article.find(
    { ...publicArticleFilter, slug: { $ne: slug } },
    { title: 1, slug: 1, category: 1, tags: 1, targetKeyword: 1, contentType: 1, isEvergreen: 1, body: 1 },
  ).lean();

  const myTags = new Set([...(article.tags || []), article.targetKeyword].filter(Boolean).map(norm));

  const scored = others.map((o) => {
    const oTags = new Set([...(o.tags || []), o.targetKeyword].filter(Boolean).map(norm));
    let overlap = 0;
    for (const t of myTags) if (oTags.has(t)) overlap += 1;
    if (article.category === o.category) overlap += 0.5;
    return { article: o, overlap };
  });

  const suggested = scored
    .filter((s) => s.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 8)
    .map((s) => ({ title: s.article.title, slug: s.article.slug, category: s.article.category, score: Math.round(s.overlap * 10) / 10 }));

  // Outgoing = internal /article/<slug> links already present in the body.
  const outgoing = [];
  const linkRe = /href="\/article\/([a-z0-9-]+)"/gi;
  let m;
  while ((m = linkRe.exec(article.body || '')) !== null) outgoing.push(m[1]);

  // Incoming = other articles whose body links to this slug.
  const incoming = others
    .filter((o) => new RegExp(`/article/${slug}"`, 'i').test(o.body || ''))
    .map((o) => ({ title: o.title, slug: o.slug }));

  const related = (kind) =>
    suggested.filter((s) => {
      const o = others.find((x) => x.slug === s.slug);
      const isGuide = o?.contentType === 'evergreen' || o?.isEvergreen;
      if (kind === 'guides') return isGuide;
      if (kind === 'news') return !isGuide;
      return false;
    });

  return {
    slug,
    title: article.title,
    suggestedLinks: suggested,
    outgoingLinks: [...new Set(outgoing)],
    incomingLinks: incoming,
    relatedGuides: related('guides'),
    relatedNews: related('news'),
  };
}
