import { ArticleManager } from '@/components/admin/ArticleManager';

export const metadata = { title: 'Articles', robots: { index: false, follow: false } };

export default function AdminArticlesPage() {
  return <ArticleManager />;
}
