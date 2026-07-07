import { wikipediaArticleUrl, normalizeWikipediaLinks } from './wikipediaLinks.js';
import { stripHtml, prepareArticleHtml } from './stripHtml.js';

export const ARTICLE_FOOTER_MARKER = '<!-- ARTICLE_FOOTER -->';
export const ARTICLE_FOLLOWUP_MARKER = '<!-- ARTICLE_FOLLOWUP -->';

/** Remove markdown headings / legal blocks the model may still emit. */
export function cleanArticleMainBody(body) {
  if (!body) return '';
  let text = body.trim();

  const cutPatterns = [
    /\n##\s*Sources[\s\S]*$/i,
    /\n##\s*Editorial notice[\s\S]*$/i,
    /\n##\s*Image credit[\s\S]*$/i,
    /<h2[^>]*>\s*Sources[\s\S]*$/i,
    /<div class="article-legal-footer"[\s\S]*$/i,
    new RegExp(`${ARTICLE_FOLLOWUP_MARKER}[\\s\\S]*?(?=${ARTICLE_FOOTER_MARKER}|$)`, 'i'),
    /<section class="article-followup"[\s\S]*?<\/section>/i,
    /<h2[^>]*>\s*Related reading[\s\S]*?(?=<!-- ARTICLE_FOOTER -->|$)/i,
  ];
  for (const re of cutPatterns) {
    text = text.replace(re, '');
  }

  text = text
    .replace(/^##\s+(.+)$/gm, '<h2><strong>$1</strong></h2>')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return prepareArticleHtml(wrapLinksInEm(normalizeWikipediaLinks(text)));
}

function resolveFollowUpUrl(item) {
  const direct = String(item.url || item.href || '').trim();
  if (/^https?:\/\//i.test(direct)) return direct;

  const wikiTitle = stripHtml(item.wikiTitle || item.wikipediaTitle || '')
    .replace(/\?+$/, '')
    .trim();
  if (wikiTitle) return wikipediaArticleUrl(wikiTitle);

  const phrase = stripHtml(item.linkPhrase || '').trim();
  if (phrase) return wikipediaArticleUrl(phrase);

  return null;
}

function italicLink(url, label) {
  return `<em><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a></em>`;
}

export function wrapLinksInEm(html) {
  if (!html) return '';
  return html.replace(/<a(\s[^>]*?)>([\s\S]*?)<\/a>/gi, (match, attrs, inner) => {
    if (/^\s*<em[\s>]/i.test(inner) || /<a[\s>]/i.test(inner)) return match;
    return `<em><a${attrs}>${inner}</a></em>`;
  });
}

export function buildArticleFaqHtml(faqSchema) {
  if (!Array.isArray(faqSchema) || faqSchema.length === 0) return '';

  const items = faqSchema
    .slice(0, 4)
    .map((item) => {
      const q = stripHtml(item.question || item.q || '').trim();
      const a = stripHtml(item.answer || item.a || '').trim();
      if (!q || !a) return '';
      return `<div class="article-faq-item"><dt class="article-faq-q"><strong>${escapeHtml(q)}</strong></dt><dd class="article-faq-a">${escapeHtml(a)}</dd></div>`;
    })
    .filter(Boolean)
    .join('\n');

  if (!items) return '';

  return `
<section class="article-faq">
  <h2><strong>Key questions</strong></h2>
  <dl class="article-faq-list">${items}</dl>
</section>`;
}

export function buildArticleFollowUpHtml(links) {
  if (!Array.isArray(links) || links.length === 0) return '';

  const items = links
    .slice(0, 6)
    .map((item) => {
      const text = stripHtml(item.text || item.question || item.label || '');
      if (!text) return '';

      const url = resolveFollowUpUrl(item);
      if (!url) return '';

      const phrase = stripHtml(item.linkPhrase || '').trim();

      let inner;
      if (phrase && text.includes(phrase)) {
        const escaped = escapeHtml(phrase);
        inner = escapeHtml(text).replace(escaped, italicLink(url, phrase));
      } else {
        inner = italicLink(url, text);
      }

      return `<li class="article-followup-item">${inner}</li>`;
    })
    .filter(Boolean)
    .join('\n');

  if (!items) return '';

  return `${ARTICLE_FOLLOWUP_MARKER}
<section class="article-followup">
  <h2><strong>Related reading &amp; questions</strong></h2>
  <ul class="article-followup-list">${items}</ul>
  <p class="article-followup-note">Further reading opens on Wikipedia or the original publisher in a new tab.</p>
</section>`;
}

export function buildArticleFooterHtml({ sourceName, sourceUrl, hero }) {
  const publisher = sourceName || 'Original publisher';
  const storyLink = sourceUrl || '#';
  const imageLine = hero?.url
    ? hero.viaGoogle
      ? `Image located via Google Images; rights remain with <a href="${escapeHtml(hero.creditUrl || storyLink)}" rel="noopener noreferrer">${escapeHtml(hero.credit || publisher)}</a>.`
      : `Image courtesy of <a href="${escapeHtml(hero.creditUrl || storyLink)}" rel="noopener noreferrer">${escapeHtml(hero.credit || publisher)}</a>.`
    : '';

  return `${ARTICLE_FOOTER_MARKER}
<div class="article-legal-footer">
  <p class="article-legal-line"><span class="article-legal-label">Sources:</span> <a href="${escapeHtml(storyLink)}" rel="noopener noreferrer">${escapeHtml(publisher)}</a></p>
  <p class="article-legal-line"><span class="article-legal-label">Editorial notice:</span> Independent editorial coverage by The Daily Lens based on publicly reported information. We are not affiliated with the original publisher.</p>
  <p class="article-legal-line"><span class="article-legal-label">Copyright &amp; images:</span> Article text is original editorial content. Images are sourced from royalty-free, Creative Commons, or Wikimedia Commons libraries where noted, or AI-generated placeholders when no suitable free image is found.</p>
  ${imageLine ? `<p class="article-legal-line"><span class="article-legal-label">Image credit:</span> ${imageLine}</p>` : ''}
</div>`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function assembleArticleBody(mainHtml, footerOrOptions) {
  const options =
    typeof footerOrOptions === 'string' ? { footerHtml: footerOrOptions } : footerOrOptions || {};

  let body = cleanArticleMainBody(mainHtml);

  const { followUpHtml, footerHtml } = options;
  if (followUpHtml && !body.includes(ARTICLE_FOLLOWUP_MARKER)) {
    body = `${body}\n\n${followUpHtml}`;
  }
  if (footerHtml && !body.includes(ARTICLE_FOOTER_MARKER)) {
    body = `${body}\n\n${footerHtml}`;
  }

  return prepareArticleHtml(wrapLinksInEm(normalizeWikipediaLinks(body)));
}
