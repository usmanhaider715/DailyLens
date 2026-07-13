'use client';

import {
  BarChart3,
  Eye,
  Gauge,
  Clock,
  TrendingUp,
  FileText,
} from 'lucide-react';
import {
  useApi,
  Card,
  Stat,
  Badge,
  ProgressBar,
  HealthDot,
  Loading,
  ErrorNote,
  Empty,
  ExportButton,
  healthColor,
} from '../primitives.jsx';

const STATUS_TONE = { healthy: 'green', growing: 'blue', 'at-risk': 'red' };

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function CategoriesTab() {
  const { data, loading, error } = useApi('/admin/seo/categories');

  if (loading) return <Loading />;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data?.categories?.length) return <Empty>No categories configured.</Empty>;

  const totals = data.categories.reduce(
    (acc, c) => ({
      published: acc.published + c.articlesPublished,
      traffic: acc.traffic + c.totalTraffic,
      health: acc.health + c.contentHealth,
    }),
    { published: 0, traffic: 0, health: 0 },
  );
  const avgHealth = Math.round(totals.health / data.categories.length);

  const csvRows = data.categories.map((c) => ({
    category: c.name,
    published: c.articlesPublished,
    thisMonth: c.publishedThisMonth,
    targetMonthly: c.target.targetMonthlyArticles,
    avgAuthority: c.avgAuthorityScore,
    avgSeo: c.avgSeoScore,
    avgReadTime: c.avgReadTime,
    avgTraffic: c.avgTraffic,
    contentHealth: c.contentHealth,
    status: c.status,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={FileText} label="Evergreen articles" value={totals.published} />
        <Stat icon={Eye} label="Total traffic" value={totals.traffic.toLocaleString()} />
        <Stat icon={Gauge} label="Avg content health" value={avgHealth} tone={healthColor(avgHealth)} />
        <Stat
          icon={BarChart3}
          label="Categories tracked"
          value={data.categories.length}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          CTR &amp; ranking position require Google Search Console (see the Search Console tab).
        </p>
        <ExportButton rows={csvRows} filename="seo-categories.csv" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.categories.map((c) => {
          const pace = c.target.targetMonthlyArticles
            ? Math.round((c.publishedThisMonth / c.target.targetMonthlyArticles) * 100)
            : 100;
          return (
            <Card
              key={c.name}
              title={c.name}
              right={
                <Badge tone={STATUS_TONE[c.status] || 'gray'}>
                  <HealthDot value={c.contentHealth} /> {c.status}
                </Badge>
              }
            >
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <Metric label="Published" value={c.articlesPublished} />
                <Metric label="This month" value={`${c.publishedThisMonth} / ${c.target.targetMonthlyArticles}`} />
                <Metric label="Avg authority" value={`${c.avgAuthorityScore} / ${c.target.targetAuthorityScore}`} />
                <Metric label="Avg SEO" value={c.avgSeoScore || '—'} />
                <Metric label="Avg read time" value={c.avgReadTime ? `${c.avgReadTime} min` : '—'} />
                <Metric label="Avg traffic" value={c.avgTraffic} />
                <Metric label="Priority" value={c.target.priorityLevel} />
                <Metric label="Intent" value={c.target.targetSearchIntent} />
              </dl>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
                  <span>Monthly pace</span>
                  <span>{pace}%</span>
                </div>
                <ProgressBar value={pace} />
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Gauge className="h-3 w-3" /> Content health
                  </span>
                  <span className={healthColor(c.contentHealth)}>{c.contentHealth}</span>
                </div>
                <ProgressBar value={c.contentHealth} />
              </div>

              {c.topArticle && (
                <p className="mt-3 truncate text-[11px] text-gray-500">
                  <TrendingUp className="mr-1 inline h-3 w-3" />
                  Top: {c.topArticle.title} ({c.topArticle.views} views)
                </p>
              )}
              <p className="mt-1 text-[11px] text-gray-400">
                <Clock className="mr-1 inline h-3 w-3" />
                Generated {fmtDate(c.lastGenerated)} · Updated {fmtDate(c.lastUpdated)}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <dt className="text-gray-400">{label}</dt>
      <dd className="font-semibold text-gray-800 dark:text-gray-200">{value}</dd>
    </div>
  );
}
