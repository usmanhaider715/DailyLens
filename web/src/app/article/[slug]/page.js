import { notFound } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { ArticleView } from '@/components/pages/ArticleView';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildNewsArticleJsonLd, buildBreadcrumbJsonLd } from '@/utils/seoHelpers';
import { buildArticleMetadata } from '@/utils/articleMetadata';

export const revalidate = 30;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const data = await fetchApi(`/articles/${slug}`, { revalidate: 120 });
    const article = data?.article;
    if (!article) return { title: 'Article not found' };
    return buildArticleMetadata(article, slug);
  } catch {
    return {
      title: 'Article not found',
      description: 'This article could not be found on The Daily Lens.',
      robots: { index: false, follow: false },
    };
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

  const article = data.article;
  const jsonLd = [
    buildNewsArticleJsonLd({ article, canonical: `/article/${slug}` }),
    buildBreadcrumbJsonLd([
      { name: 'Home', url: '/' },
      { name: article.category, url: `/category/${encodeURIComponent(article.category)}` },
      { name: article.title, url: `/article/${slug}` },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <ArticleView article={article} related={data.related || []} />
    </>
  );
}
