'use client';

import { AlertTriangle, KeyRound, Link2, Layers } from 'lucide-react';
import {
  useApi,
  Card,
  Stat,
  Badge,
  MiniBars,
  Loading,
  ErrorNote,
  Empty,
  ExportButton,
  SectionTable,
} from '../primitives.jsx';

const INTENT_TONE = {
  informational: 'blue',
  commercial: 'amber',
  transactional: 'green',
  navigational: 'gray',
};

export function KeywordsTab() {
  const { data, loading, error } = useApi('/admin/seo/keywords');

  if (loading) return <Loading />;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Empty />;

  const intentBars = Object.entries(data.intentDistribution || {}).map(([label, value]) => ({
    label,
    value,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={KeyRound} label="Keywords tracked" value={data.totalKeywords} />
        <Stat
          icon={AlertTriangle}
          label="Cannibalization"
          value={data.cannibalization.length}
          tone={data.cannibalization.length ? 'text-red-600 dark:text-red-400' : ''}
        />
        <Stat icon={Layers} label="Uncovered hub groups" value={data.missingKeywords.length} />
      </div>

      <ErrorNote>
        <span className="font-normal">{data.external.note}</span>
      </ErrorNote>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Top keywords"
          subtitle="By article traffic (internal)"
          right={<ExportButton rows={data.topKeywords} filename="top-keywords.csv" />}
        >
          <SectionTable
            keyField="keyword"
            rows={data.topKeywords}
            empty="No keywords yet."
            columns={[
              { key: 'keyword', label: 'Keyword' },
              { key: 'articles', label: 'Articles' },
              { key: 'views', label: 'Views' },
              {
                key: 'intent',
                label: 'Intent',
                render: (r) => <Badge tone={INTENT_TONE[r.intent]}>{r.intent}</Badge>,
              },
            ]}
          />
        </Card>

        <Card title="Commercial keywords" subtitle="Commercial / transactional intent">
          <SectionTable
            keyField="keyword"
            rows={data.commercialKeywords}
            empty="No commercial keywords detected."
            columns={[
              { key: 'keyword', label: 'Keyword' },
              { key: 'articles', label: 'Articles' },
              { key: 'views', label: 'Views' },
            ]}
          />
        </Card>

        <Card title="Keyword cannibalization" subtitle="Same target keyword on multiple articles">
          {data.cannibalization.length === 0 ? (
            <Empty>No cannibalization detected.</Empty>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.cannibalization.map((c) => (
                <li key={c.keyword} className="rounded-lg border border-gray-100 p-2 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.keyword}</span>
                    <Badge tone="red">{c.count} articles</Badge>
                  </div>
                  <ul className="mt-1 text-xs text-gray-500">
                    {c.articles.map((a) => (
                      <li key={a.slug} className="truncate">
                        · {a.title}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Missing keywords" subtitle="Hub keywords with no coverage">
          {data.missingKeywords.length === 0 ? (
            <Empty>Full hub coverage.</Empty>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.missingKeywords.map((m) => (
                <li key={m.slug}>
                  <div className="font-medium text-gray-800 dark:text-gray-200">{m.hub}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {m.keywords.map((k) => (
                      <Badge key={k} tone="amber">
                        {k}
                      </Badge>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="SERP intent distribution">
          {intentBars.length ? <MiniBars data={intentBars} /> : <Empty />}
        </Card>

        <Card title="Suggested hub pages & internal links">
          <div className="space-y-3 text-sm">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-gray-400">Suggested hub pages</p>
              {data.suggestedHubPages.length ? (
                data.suggestedHubPages.map((h) => (
                  <div key={h.slug} className="flex items-center justify-between">
                    <span>{h.hub}</span>
                    <Badge tone="blue">{h.uncovered} gaps</Badge>
                  </div>
                ))
              ) : (
                <Empty />
              )}
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-gray-400">
                <Link2 className="mr-1 inline h-3 w-3" /> Internal link opportunities
              </p>
              {data.suggestedInternalLinks.length ? (
                <div className="flex flex-wrap gap-1">
                  {data.suggestedInternalLinks.map((l) => (
                    <Badge key={l.keyword} tone="primary">
                      {l.keyword} ({l.articles})
                    </Badge>
                  ))}
                </div>
              ) : (
                <Empty />
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
