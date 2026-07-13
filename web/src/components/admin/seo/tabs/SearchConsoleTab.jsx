'use client';

import toast from 'react-hot-toast';
import { MousePointerClick, Eye, Percent, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { api } from '@/services/api';
import {
  useApi,
  Card,
  Stat,
  Badge,
  Loading,
  ErrorNote,
  Empty,
  NotConnected,
  SectionTable,
  ExportButton,
} from '../primitives.jsx';

const pct = (v) => `${(Number(v) * 100).toFixed(1)}%`;

export function SearchConsoleTab() {
  const { data, loading, error } = useApi('/admin/seo/search-console');

  if (loading) return <Loading />;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Empty />;
  if (!data.connected) return <NotConnected reason={data.reason} />;

  const seedArticle = async (query) => {
    try {
      await api.post('/admin/seo/manual-generate', { keyword: query });
      toast.success(`Started a supporting article for "${query}".`);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not start generation');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={MousePointerClick} label="Clicks (28d)" value={data.totals.clicks.toLocaleString()} />
        <Stat icon={Eye} label="Impressions" value={data.totals.impressions.toLocaleString()} />
        <Stat icon={Percent} label="CTR" value={pct(data.totals.ctr)} />
      </div>

      <Card
        title="Ranking opportunities"
        subtitle="Striking distance — positions 5-20"
        right={<ExportButton rows={data.rankingOpportunities} filename="ranking-opportunities.csv" />}
      >
        <SectionTable
          keyField="query"
          rows={data.rankingOpportunities}
          empty="No striking-distance queries."
          columns={[
            { key: 'query', label: 'Query' },
            { key: 'position', label: 'Position', render: (r) => r.position.toFixed(1) },
            { key: 'impressions', label: 'Impressions' },
            {
              key: 'action',
              label: '',
              render: (r) => (
                <button type="button" onClick={() => seedArticle(r.query)} className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline dark:text-primary-400">
                  <Sparkles className="h-3 w-3" /> Improve CTR
                </button>
              ),
            },
          ]}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Pages gaining traffic" right={<TrendingUp className="h-4 w-4 text-green-500" />}>
          <SectionTable
            keyField="page"
            rows={data.pagesGainingTraffic}
            empty="No gainers."
            columns={[
              { key: 'page', label: 'Page', render: (r) => <span className="truncate">{r.page.replace(/^https?:\/\/[^/]+/, '')}</span> },
              { key: 'deltaClicks', label: 'Δ Clicks', render: (r) => <Badge tone="green">+{r.deltaClicks}</Badge> },
            ]}
          />
        </Card>
        <Card title="Pages losing traffic" right={<TrendingDown className="h-4 w-4 text-red-500" />}>
          <SectionTable
            keyField="page"
            rows={data.pagesLosingTraffic}
            empty="No decliners."
            columns={[
              { key: 'page', label: 'Page', render: (r) => <span className="truncate">{r.page.replace(/^https?:\/\/[^/]+/, '')}</span> },
              { key: 'deltaClicks', label: 'Δ Clicks', render: (r) => <Badge tone="red">{r.deltaClicks}</Badge> },
            ]}
          />
        </Card>
      </div>

      <Card title="Top queries" right={<ExportButton rows={data.queries} filename="gsc-queries.csv" />}>
        <SectionTable
          keyField="query"
          rows={data.queries.slice(0, 50)}
          empty="No queries."
          columns={[
            { key: 'query', label: 'Query' },
            { key: 'clicks', label: 'Clicks' },
            { key: 'impressions', label: 'Impressions' },
            { key: 'ctr', label: 'CTR', render: (r) => pct(r.ctr) },
            { key: 'position', label: 'Pos', render: (r) => r.position.toFixed(1) },
          ]}
        />
      </Card>
    </div>
  );
}
