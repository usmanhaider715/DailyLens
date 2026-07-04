import {
  assembleArticleBody,
  buildArticleFooterHtml,
  buildArticleFollowUpHtml,
  buildArticleFaqHtml,
  cleanArticleMainBody,
} from './articleBodyFormat.js';

/** Attach FAQ, related reading, and footer to AI main body. */
export function finalizeSeoArticleBody(parsed, raw, hero = null) {
  const main = cleanArticleMainBody(parsed.body || '');
  const faqHtml = buildArticleFaqHtml(parsed.faqSchema);
  const followUpHtml = buildArticleFollowUpHtml(parsed.followUpLinks);
  const footerHtml = buildArticleFooterHtml({
    sourceName: raw.sourceName || raw.source?.name,
    sourceUrl: raw.sourceUrl || raw.url || raw.source?.url,
    hero,
  });

  const extras = [faqHtml, followUpHtml].filter(Boolean).join('\n\n');
  const body = assembleArticleBody(main, { followUpHtml: extras, footerHtml });

  return { ...parsed, body };
}
