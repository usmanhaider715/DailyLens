import { ArticleEditor } from '@/components/admin/ArticleEditor';

export const metadata = { title: 'New Article', robots: { index: false, follow: false } };

export default function NewArticlePage() {
  return <ArticleEditor />;
}
