import { ArticleEditor } from '@/components/admin/ArticleEditor';

export const metadata = { title: 'Edit Article', robots: { index: false, follow: false } };

export default function EditArticlePage() {
  return <ArticleEditor />;
}
