import { notFound } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { stripHtml } from '@/utils/stripHtml';
import { ArticleView } from '@/components/pages/ArticleView';

export const revalidate = 120;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const data = await fetchApi(`/articles/${slug}`, { revalidate: 120 });
    const article = data.article;
    const description = stripHtml(article.summary);
    const images = article.heroImage?.url ? [{ url: article.heroImage.url }] : [];
    return {
      title: article.title,
      description,
      openGraph: {
        title: article.title,
        description,
        type: 'article',
        publishedTime: article.publishedAt,
        images,
      },
      twitter: { card: 'summary_large_image', title: article.title, description, images },
    };
  } catch {
    return { title: 'Article not found' };
  }
}

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  let data;
  try {
    data = await fetchApi(`/articles/${slug}`, { revalidate: 120 });
  } catch {
    notFound();
  }
  if (!data?.article) notFound();
  return <ArticleView article={data.article} related={data.related || []} />;
}
