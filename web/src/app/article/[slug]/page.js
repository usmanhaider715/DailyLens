import { notFound } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { ArticleView } from '@/components/pages/ArticleView';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildNewsArticleJsonLd, buildBreadcrumbJsonLd, buildFaqPageJsonLd } from '@/utils/seoHelpers';
import { buildArticleMetadata } from '@/utils/articleMetadata';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const data = await fetchApi(`/articles/${slug}`, { cache: 'no-store' });
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
  const isEvergreen = article.contentType === 'evergreen' || article.isEvergreen;
  const breadcrumbParent = isEvergreen
    ? { name: 'Evergreen', url: '/evergreen' }
    : { name: article.category, url: `/category/${encodeURIComponent(article.category)}` };

  const jsonLd = [
    buildNewsArticleJsonLd({ article, canonical: `/article/${slug}` }),
    buildBreadcrumbJsonLd([
      { name: 'Home', url: '/' },
      breadcrumbParent,
      { name: article.title, url: `/article/${slug}` },
    ]),
  ];
  const faqLd = buildFaqPageJsonLd({ faq: article.faq, canonical: `/article/${slug}` });
  if (faqLd) jsonLd.push(faqLd);

  return (
    <>
      <JsonLd data={jsonLd} />
      <ArticleView
        article={article}
        related={data.related || []}
        recommendations={data.recommendations}
      />
    </>
  );
}
