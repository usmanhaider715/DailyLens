import crypto from 'crypto';

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
  'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can',
  'how', 'what', 'when', 'where', 'why', 'who', 'which', 'that', 'this', 'these', 'those',
  'your', 'you', 'i', 'we', 'they', 'it', 'its', 'our', 'their', 'my', 'me', 'us', 'them',
]);

export function tokenizeTitle(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export function jaccardSimilarity(a, b) {
  const setA = new Set(tokenizeTitle(a));
  const setB = new Set(tokenizeTitle(b));
  if (!setA.size && !setB.size) return 1;
  if (!setA.size || !setB.size) return 0;
  let inter = 0;
  for (const t of setA) {
    if (setB.has(t)) inter += 1;
  }
  const union = setA.size + setB.size - inter;
  return union ? inter / union : 0;
}

export function computeTopicHash(title, keyword = '') {
  const tokens = [...new Set([...tokenizeTitle(title), ...tokenizeTitle(keyword)])].sort();
  const normalized = tokens.join(' ');
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}

export function isDuplicateTopic(idea, existingRows, threshold = 0.8) {
  const hash = computeTopicHash(idea.title, idea.target_keyword || idea.targetKeyword);
  if (existingRows.some((row) => row.topicHash === hash)) {
    return { duplicate: true, reason: 'hash', hash };
  }
  for (const row of existingRows) {
    const simTitle = jaccardSimilarity(idea.title, row.title);
    const simKeyword = jaccardSimilarity(
      idea.target_keyword || idea.targetKeyword || '',
      row.targetKeyword || '',
    );
    if (simTitle >= threshold || simKeyword >= threshold) {
      return { duplicate: true, reason: 'similarity', similarity: Math.max(simTitle, simKeyword), hash };
    }
  }
  return { duplicate: false, hash };
}
