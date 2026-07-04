import { stripHtml } from './stripHtml.js';

function truncateLine(text, max = 200) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.5 ? cut.slice(0, sp) : cut).trim()}…`;
}

function shortenBullet(text, max = 140) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return truncateLine(t, max);
}

export function buildSourceNewsBrief(article) {
  if (!article) {
    return { oneLiner: '', bullets: [], sourceName: null, sourceUrl: null, hasBrief: false };
  }

  const oneLiner = truncateLine(
    (article.originalTitle && article.originalTitle.trim() !== article.title?.trim()
      ? article.originalTitle
      : article.summary) || article.title,
    220
  );

  const bullets = [];
  const body = String(article.body || '').split('<!--')[0];

  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let match;
  while ((match = h2Regex.exec(body)) && bullets.length < 6) {
    const heading = stripHtml(match[1]).trim();
    if (!heading || /sources|editorial notice|image credit|related reading/i.test(heading)) continue;

    const after = body.slice(match.index + match[0].length);
    const nextIdx = after.search(/<h2/i);
    const sectionHtml = nextIdx === -1 ? after : after.slice(0, nextIdx);
    const sectionText = stripHtml(sectionHtml).trim();
    const sentence =
      sectionText.match(/[^.!?]+[.!?]+/)?.[0]?.trim() || sectionText.slice(0, 160);

    if (sentence) {
      bullets.push(shortenBullet(`${heading} — ${sentence}`));
    } else {
      bullets.push(shortenBullet(heading));
    }
  }

  if (bullets.length < 4) {
    const plain = stripHtml(body);
    const sentences = plain
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 35 && !bullets.some((b) => b.startsWith(s.slice(0, 30))));

    for (const s of sentences) {
      if (bullets.length >= 6) break;
      bullets.push(shortenBullet(s));
    }
  }

  const sourceUrl = article.originalUrl || article.source?.url || null;
  const sourceName = article.source?.name || null;

  return {
    oneLiner,
    bullets: bullets.slice(0, 6),
    sourceName,
    sourceUrl,
    hasBrief: Boolean(oneLiner || bullets.length),
  };
}
