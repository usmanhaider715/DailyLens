import { notFound } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { stripHtml } from '@/utils/stripHtml';
import { ArticleView } from '@/components/pages/ArticleView';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildNewsArticleJsonLd, buildBreadcrumbJsonLd } from '@/utils/seoHelpers';

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
      alternates: { canonical: `/article/${slug}` },
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
