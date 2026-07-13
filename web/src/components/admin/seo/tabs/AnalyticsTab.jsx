'use client';

import { Eye, FileText, TrendingUp, Gauge } from 'lucide-react';
import {
  useApi,
  Card,
  Stat,
  MiniBars,
  Loading,
  ErrorNote,
  Empty,
  healthColor,
  SectionTable,
} from '../primitives.jsx';

export function AnalyticsTab() {
  const { data, loading, error } = useApi('/admin/seo/analytics');

  if (loading) return <Loading />;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Empty />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={FileText} label="Published" value={data.totals.published} />
        <Stat icon={Eye} label="Total traffic" value={data.totals.totalTraffic.toLocaleString()} />
        <Stat icon={Gauge} label="Avg health" value={data.totals.avgHealth} tone={healthColor(data.totals.avgHealth)} />
        <Stat
          icon={TrendingUp}
          label="MoM growth"
          value={data.growthPct == null ? '—' : `${data.growthPct}%`}
          tone={data.growthPct > 0 ? 'text-green-600 dark:text-green-400' : data.growthPct < 0 ? 'text-red-600 dark:text-red-400' : ''}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Published per month">
          <MiniBars data={data.monthly} valueKey="published" labelKey="label" tone="primary" />
        </Card>
        <Card title="Traffic per month">
          <MiniBars data={data.monthly} valueKey="traffic" labelKey="label" tone="blue" />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Traffic by category">
          <SectionTable
            keyField="category"
            rows={data.trafficByCategory}
            empty="No traffic yet."
            columns={[
              { key: 'category', label: 'Category' },
              { key: 'traffic', label: 'Traffic', render: (r) => r.traffic.toLocaleString() },
            ]}
          />
        </Card>
        <Card title="Top articles">
          <SectionTable
            keyField="slug"
            rows={data.topArticles}
            empty="No articles yet."
            columns={[
              {
                key: 'title',
                label: 'Article',
                render: (r) => (
                  <a href={`/article/${r.slug}`} target="_blank" rel="noreferrer" className="text-primary-700 hover:underline dark:text-primary-400">
                    {r.title}
                  </a>
                ),
              },
              { key: 'views', label: 'Views' },
              { key: 'health', label: 'Health', render: (r) => <span className={healthColor(r.health)}>{r.health}</span> },
            ]}
          />
        </Card>
      </div>

      <Card title="Not available yet" subtitle="These require external connections">
        <ul className="grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
          <li>· CTR — {data.unavailable.ctr}</li>
          <li>· Ranking position — {data.unavailable.rankingPosition}</li>
          <li>· Conversions — {data.unavailable.conversions}</li>
          <li>· Revenue — {data.unavailable.revenue}</li>
        </ul>
      </Card>
    </div>
  );
}
