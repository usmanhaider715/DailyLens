export function truncateText(text, max = 160) {
  if (!text) return '';
  const t = String(text).trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
