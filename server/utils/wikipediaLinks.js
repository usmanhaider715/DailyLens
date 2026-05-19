/** Build a standard English Wikipedia article URL from a page title. */
export function wikipediaArticleUrl(title) {
  const slug = String(title || '')
    .trim()
    .replace(/\s+/g, '_');
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(slug).replace(/%20/g, '_')}`;
}

/** Ensure Wikipedia anchors open safely and use underscore slugs. */
export function normalizeWikipediaLinks(html) {
  if (!html) return html;

  return html.replace(
    /<a\s+([^>]*?)href=["'](https?:\/\/(?:[a-z]{2,3}\.)?wikipedia\.org\/wiki\/)([^"']+)["']([^>]*?)>/gi,
    (_match, before, prefix, path, after) => {
      const fixedPath = decodeURIComponent(path.replace(/\+/g, ' '))
        .replace(/ /g, '_')
        .split('/')
        .map((seg) => encodeURIComponent(seg).replace(/%20/g, '_'))
        .join('/');

      let attrs = `${before}href="${prefix}${fixedPath}"${after}`;
      if (!/target=/i.test(attrs)) attrs += ' target="_blank"';
      if (!/rel=/i.test(attrs)) attrs += ' rel="noopener noreferrer"';
      return `<a ${attrs.trim()}>`;
    }
  );
}
