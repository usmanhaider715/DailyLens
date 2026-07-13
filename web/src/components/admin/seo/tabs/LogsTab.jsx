'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useApi, Card, Badge, Loading, ErrorNote, Empty } from '../primitives.jsx';

const STATUS_TONE = { success: 'green', partial: 'amber', failed: 'red', running: 'blue' };

function fmtDuration(ms) {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function LogsTab() {
  const { data, loading, error } = useApi('/admin/seo/logs', { params: { limit: 25 } });
  const [open, setOpen] = useState(null);

  if (loading) return <Loading />;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data?.logs?.length) return <Empty>No pipeline runs yet.</Empty>;

  return (
    <div className="space-y-3">
      {data.logs.map((log) => {
        const isOpen = open === log._id;
        return (
          <Card key={log._id} className="!p-0">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : log._id)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
            >
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Badge tone={STATUS_TONE[log.status] || 'gray'}>{log.status}</Badge>
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  {new Date(log.startedAt).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <Badge tone="gray">{log.triggeredBy}</Badge>
              </div>
              <div className="hidden items-center gap-3 text-xs text-gray-500 sm:flex">
                <span>{log.providerUsed}</span>
                <span>{fmtDuration(log.generationTimeMs)}</span>
                <span>{log.articlesGenerated} generated</span>
              </div>
            </button>

            {isOpen && (
              <div className="space-y-4 border-t border-gray-100 p-4 dark:border-gray-800">
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  <LogStat label="Provider" value={log.providerUsed} />
                  <LogStat label="Generation time" value={fmtDuration(log.generationTimeMs)} />
                  <LogStat label="Ideas considered" value={log.ideasConsidered} />
                  <LogStat label="Topics rejected" value={log.topicsRejected} />
                  <LogStat label="Duplicate detection" value={log.duplicateDetection} />
                  <LogStat label="Generated" value={log.articlesGenerated} />
                  <LogStat label="Published" value={log.articlesPublished} />
                  <LogStat label="Pending" value={log.articlesPending} />
                  <LogStat label="Avg SEO" value={log.avgSeoScore ?? '—'} />
                  <LogStat label="Avg authority" value={log.avgAuthorityScore ?? '—'} />
                  <LogStat label="Avg quality" value={log.avgQualityScore ?? '—'} />
                  <LogStat label="Tokens" value={(log.tokenUsage.inputTokens || 0) + (log.tokenUsage.outputTokens || 0)} />
                  <LogStat label="API cost" value={`$${(log.apiCostUsd || 0).toFixed(4)}`} />
                  <LogStat label="Rejection reason" value={log.rejectionReason || '—'} />
                  <LogStat label="Categories" value={(log.categoriesRun || []).join(', ') || '—'} />
                </div>

                {log.providerFallbacks.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-gray-400">Provider fallbacks</p>
                    {log.providerFallbacks.map((f, i) => (
                      <p key={i} className="text-xs text-amber-600 dark:text-amber-400">
                        {f.from} → {f.to} ({f.reason})
                      </p>
                    ))}
                  </div>
                )}

                {log.details.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 uppercase text-gray-500 dark:bg-gray-800/50">
                        <tr>
                          <th className="px-3 py-2">Title</th>
                          <th className="px-3 py-2">Cluster</th>
                          <th className="px-3 py-2">Intent</th>
                          <th className="px-3 py-2">SEO</th>
                          <th className="px-3 py-2">Authority</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {log.details.map((d, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2">
                              {d.slug ? (
                                <a href={`/article/${d.slug}`} target="_blank" rel="noreferrer" className="text-primary-700 hover:underline dark:text-primary-400">{d.title}</a>
                              ) : d.title}
                            </td>
                            <td className="px-3 py-2 text-gray-500">{d.cluster || '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{d.searchIntent || '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{d.seoScore ?? '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{d.authorityScore ?? '—'}</td>
                            <td className="px-3 py-2"><Badge tone="gray">{d.reviewStatus || d.action}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {log.failureMessages.length > 0 && (
                  <div className="text-xs text-red-600 dark:text-red-400">
                    {log.failureMessages.map((m, i) => <p key={i}>· {m}</p>)}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function LogStat({ label, value }) {
  return (
    <div>
      <div className="text-gray-400">{label}</div>
      <div className="font-semibold text-gray-800 dark:text-gray-200">{value}</div>
    </div>
  );
}
