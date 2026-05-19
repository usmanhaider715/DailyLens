import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { Navbar } from '../components/layout/Navbar.jsx';
import { Footer } from '../components/layout/Footer.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { stripHtml } from '../utils/stripHtml.js';
import { SeoHead } from '../components/seo/SeoHead.jsx';

export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!q) {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const { data } = await api.get('/search', { params: { q } });
        if (!cancelled) setItems(data || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q]);

  return (
    <div>
      <SeoHead
        title={q ? `Search: ${q}` : 'Search'}
        description={q ? `Search results for "${q}" on The Daily Lens.` : 'Search The Daily Lens news archive.'}
        path={`/search${q ? `?q=${encodeURIComponent(q)}` : ''}`}
        noindex
      />
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Search results</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">Query: {q}</p>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {items.map((a) => (
              <li key={a._id || a.slug} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                <Link to={`/article/${a.slug}`} className="font-semibold text-primary-800 dark:text-primary-200">
                  {a.title}
                </Link>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{stripHtml(a.summary)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Footer />
    </div>
  );
}
