import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { Navbar } from '../components/layout/Navbar.jsx';
import { Footer } from '../components/layout/Footer.jsx';
import { ArticleCard } from '../components/home/ArticleCard.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import VirtualArticleGrid from './CategoryVirtualGrid.jsx';
import { LiveScoreboard } from '../components/home/LiveScoreboard.jsx';
import { WeatherForecastPanel } from '../components/home/WeatherForecastPanel.jsx';
import { SeoHead } from '../components/seo/SeoHead.jsx';
import { buildBreadcrumbJsonLd } from '../utils/seoHelpers.js';

export function CategoryPage() {
  const { slug } = useParams();
  const category = decodeURIComponent(slug || 'World');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState(null);

  const load = async (p = 1, append = false) => {
    setLoading(true);
    try {
      const { data } = await api.get('/articles', {
        params: { page: p, limit: 30, category },
      });
      setPages(data.pages || 1);
      setPage(data.page || p);
      setItems((prev) => (append ? [...prev, ...(data.items || [])] : data.items || []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    if (category !== 'Weather') return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/site/weather', { params: { region: 'usa' } });
        const { data: uk } = await api.get('/site/weather', { params: { region: 'uk' } });
        if (cancelled) return;
        setWeather({
          label: 'USA & UK outlook',
          updatedAt: data.updatedAt,
          cities: [...(data.cities || []), ...(uk.cities || [])],
        });
      } catch {
        if (!cancelled) setWeather(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category]);

  const categoryPath = `/category/${encodeURIComponent(category)}`;

  return (
    <div>
      <SeoHead
        title={`${category} News`}
        description={`Latest ${category} news, analysis, and updates from The Daily Lens.`}
        path={categoryPath}
        jsonLd={buildBreadcrumbJsonLd([
          { name: 'Home', url: '/' },
          { name: category, url: categoryPath },
        ])}
      />
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
        <h1 className="font-display text-3xl font-bold text-gray-900 sm:text-4xl dark:text-white">{category}</h1>
        {category === 'Sports' && (
          <div className="mt-6">
            <LiveScoreboard />
          </div>
        )}
        {category === 'Weather' && (
          <div className="mt-6">
            <WeatherForecastPanel forecast={weather} />
          </div>
        )}
        {loading && !items.length ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : items.length > 50 ? (
          <VirtualArticleGrid items={items} />
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => (
              <ArticleCard key={a._id || a.slug} article={a} variant="default" />
            ))}
          </div>
        )}

        {page < pages && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => load(page + 1, true)}
              className="rounded-full bg-primary-700 px-6 py-2 text-sm font-semibold text-white"
            >
              Load more
            </button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
