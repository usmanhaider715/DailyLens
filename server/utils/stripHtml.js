/** Plain text only — for summaries, cards, and meta tags. */
export function stripHtml(html) {
  if (!html) return '';
  return decodeHtmlEntities(String(html))
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function decodeHtmlEntities(str) {
  return String(str || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'");
}

/** Fix AI content that was HTML-escaped before being stored in the article body. */
export function prepareArticleHtml(html) {
  if (!html) return '';
  let out = String(html);
  if (/&lt;(a|strong|h2|p|section|ul|li)\b/i.test(out)) {
    out = decodeHtmlEntities(out);
  }
  return out;
}
