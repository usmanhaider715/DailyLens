import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { ArticleBody } from '../components/article/ArticleBody.jsx';
import { Navbar } from '../components/layout/Navbar.jsx';
import { Footer } from '../components/layout/Footer.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { SeoHead } from '../components/seo/SeoHead.jsx';
import {
  buildNewsArticleJsonLd,
  buildBreadcrumbJsonLd,
} from '../utils/seoHelpers.js';
import { stripHtml } from '../utils/stripHtml.js';

export function ArticlePage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: d } = await api.get(`/articles/${slug}`);
        if (!cancelled) setData(d);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!data?.article) {
    return (
      <div className="p-10 text-center">
        <SeoHead title="Article not found" noindex />
        Article not found
      </div>
    );
  }

  const { article, related } = data;
  const plainSummary = stripHtml(article.summary);
  const path = `/article/${article.slug}`;
  const jsonLd = [
    buildNewsArticleJsonLd({ article, canonical: path }),
    buildBreadcrumbJsonLd([
      { name: 'Home', url: '/' },
      { name: article.category, url: `/category/${encodeURIComponent(article.category)}` },
      { name: article.title, url: path },
    ]),
  ];

  return (
    <div>
      <SeoHead
        title={article.title}
        description={plainSummary}
        path={path}
        image={article.heroImage?.url}
        type="article"
        jsonLd={jsonLd}
      />
      <Navbar />
      <ArticleBody article={article} related={related} />
      <Footer />
    </div>
  );
}
