import { ArticleCard } from '../home/ArticleCard.jsx';

export function RelatedArticles({ articles }) {
  if (!articles?.length) return null;
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Related</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {articles.map((a) => (
          <ArticleCard key={a._id || a.slug} article={a} variant="default" />
        ))}
      </div>
    </section>
  );
}
