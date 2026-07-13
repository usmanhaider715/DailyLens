'use client';

import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import {
  useApi,
  Card,
  Badge,
  Loading,
  ErrorNote,
  Empty,
} from '../primitives.jsx';

function IssueCard({ label, data, tone = 'amber', renderItem }) {
  const [open, setOpen] = useState(false);
  const count = data?.count ?? 0;
  return (
    <Card className="!p-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
        <Badge tone={count ? tone : 'green'}>{count}</Badge>
      </button>
      {open && count > 0 && (
        <ul className="max-h-64 space-y-1 overflow-auto border-t border-gray-100 p-4 text-xs dark:border-gray-800">
          {(data.items || []).map((it, i) => (
            <li key={i} className="truncate text-gray-600 dark:text-gray-300">
              {renderItem ? renderItem(it) : (
                <a
                  href={`/article/${it.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-700 hover:underline dark:text-primary-400"
                >
                  {it.title}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function ContentAuditTab() {
  const { data, loading, error } = useApi('/admin/seo/content-audit');

  if (loading) return <Loading />;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Empty />;

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-500">Analyzed {data.totalAnalyzed} published articles.</p>

      {data.recommendations.length > 0 && (
        <Card title="Recommendations" subtitle="Prioritized actions">
          <ul className="space-y-1.5 text-sm">
            {data.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                {r}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <IssueCard label="Thin articles" data={data.thinArticles} renderItem={(it) => (
          <a href={`/article/${it.slug}`} target="_blank" rel="noreferrer" className="text-primary-700 hover:underline dark:text-primary-400">
            {it.title} — {it.words}/{it.min} words
          </a>
        )} />
        <IssueCard label="Old / stale guides" data={data.oldArticles} renderItem={(it) => (
          <a href={`/article/${it.slug}`} target="_blank" rel="noreferrer" className="text-primary-700 hover:underline dark:text-primary-400">
            {it.title} — {it.ageDays}d old
          </a>
        )} />
        <IssueCard label="Duplicate topics" data={data.duplicateTopics} tone="red" renderItem={(it) => (
          <span>{it.a.title} ≈ {it.b.title}</span>
        )} />
        <IssueCard label="Missing images" data={data.missingImages} />
        <IssueCard label="Missing FAQs" data={data.missingFaqs} />
        <IssueCard label="Missing schema (FAQ)" data={data.missingSchema} renderItem={(it) => (
          <a href={`/article/${it.slug}`} target="_blank" rel="noreferrer" className="text-primary-700 hover:underline dark:text-primary-400">
            {it.title} — {it.schema}
          </a>
        )} />
        <IssueCard label="Weak titles" data={data.weakTitles} renderItem={(it) => (
          <a href={`/article/${it.slug}`} target="_blank" rel="noreferrer" className="text-primary-700 hover:underline dark:text-primary-400">
            {it.title} — {it.length} chars
          </a>
        )} />
        <IssueCard label="Weak meta descriptions" data={data.weakMetaDescriptions} renderItem={(it) => (
          <a href={`/article/${it.slug}`} target="_blank" rel="noreferrer" className="text-primary-700 hover:underline dark:text-primary-400">
            {it.title} — {it.length} chars
          </a>
        )} />
        <IssueCard label="Weak internal linking" data={data.weakInternalLinking} renderItem={(it) => (
          <a href={`/article/${it.slug}`} target="_blank" rel="noreferrer" className="text-primary-700 hover:underline dark:text-primary-400">
            {it.title} — {it.related} related
          </a>
        )} />
        <IssueCard label="Orphan pages" data={data.orphanPages} tone="red" />
        <IssueCard label="Low traffic pages" data={data.lowTrafficPages} renderItem={(it) => (
          <a href={`/article/${it.slug}`} target="_blank" rel="noreferrer" className="text-primary-700 hover:underline dark:text-primary-400">
            {it.title} — {it.views} views
          </a>
        )} />
      </div>

      <p className="text-xs text-gray-400">{data.brokenLinks.note}</p>
    </div>
  );
}
