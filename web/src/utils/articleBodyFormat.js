export const ARTICLE_FOOTER_MARKER = '<!-- ARTICLE_FOOTER -->';
export const ARTICLE_FOLLOWUP_MARKER = '<!-- ARTICLE_FOLLOWUP -->';

export function splitArticleBody(body) {
  if (!body) return { main: '', followUp: null, footer: null };

  let rest = body;
  let footer = null;
  if (rest.includes(ARTICLE_FOOTER_MARKER)) {
    const idx = rest.indexOf(ARTICLE_FOOTER_MARKER);
    footer = rest.slice(idx + ARTICLE_FOOTER_MARKER.length).trim();
    rest = rest.slice(0, idx).trim();
  }

  let main = rest;
  let followUp = null;
  if (rest.includes(ARTICLE_FOLLOWUP_MARKER)) {
    const idx = rest.indexOf(ARTICLE_FOLLOWUP_MARKER);
    followUp = rest.slice(idx + ARTICLE_FOLLOWUP_MARKER.length).trim();
    main = rest.slice(0, idx).trim();
  }

  return { main, followUp, footer };
}

export function chunkHtmlBody(html) {
  if (!html) return [];
  const blocks = html.split(/(?<=<\/p>)/i).map((s) => s.trim()).filter(Boolean);
  return blocks.length ? blocks : [html];
}
