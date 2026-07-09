/** Build page numbers with ellipsis for admin tables. */
export function buildPageNumbers(current, totalPages, maxVisible = 7) {
  if (totalPages <= 1) return [1];
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set([1, totalPages, current]);
  for (let i = current - 1; i <= current + 1; i++) {
    if (i > 1 && i < totalPages) pages.add(i);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('…');
    out.push(sorted[i]);
  }
  return out;
}
