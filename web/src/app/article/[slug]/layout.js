/** Ensure article metadata is resolved on every request (no stale ISR HTML). */
export const dynamic = 'force-dynamic';

export default function ArticleLayout({ children }) {
  return children;
}
