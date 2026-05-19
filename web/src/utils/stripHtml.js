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

/** Wrap anchor text in <em> for italic linked words (matches server output). */
export function wrapLinksInEm(html) {
  if (!html) return '';
  return html.replace(/<a(\s[^>]*?)>([\s\S]*?)<\/a>/gi, (match, attrs, inner) => {
    if (/^\s*<em[\s>]/i.test(inner) || /<a[\s>]/i.test(inner)) return match;
    return `<em><a${attrs}>${inner}</a></em>`;
  });
}

export function prepareArticleHtml(html) {
  if (!html) return '';
  let out = String(html);
  if (/&lt;(a|strong|h2|p|section|ul|li|em)\b/i.test(out)) {
    out = decodeHtmlEntities(out);
  }
  return wrapLinksInEm(out);
}
