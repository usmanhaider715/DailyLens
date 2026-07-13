import { ArticleCard } from '../home/ArticleCard.jsx';

function Section({ title, articles }) {
  if (!articles?.length) return null;
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {articles.map((a) => (
          <ArticleCard key={a._id || a.slug} article={a} variant="default" />
        ))}
      </div>
    </section>
  );
}

/**
 * Rich internal-linking block shown at the end of every article so readers
 * never hit a dead end: related news, related guides, popular reads, and a
 * best-overall recommendation set. Falls back to a flat related list.
 */
export function ArticleRecommendations({ data, fallback }) {
  const rec = data || {};
  const hasAny =
    rec.relatedNews?.length ||
    rec.relatedGuides?.length ||
    rec.popular?.length ||
    rec.recommended?.length;

  if (!hasAny) {
    if (!fallback?.length) return null;
    return <Section title="Related" articles={fallback} />;
  }

  return (
    <div>
      <Section title="Related news" articles={rec.relatedNews} />
      <Section title="Related guides" articles={rec.relatedGuides} />
      <Section title="Popular reads" articles={rec.popular} />
      <Section title="Recommended for you" articles={rec.recommended} />
    </div>
  );
}
