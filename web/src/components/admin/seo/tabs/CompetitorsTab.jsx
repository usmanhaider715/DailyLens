'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Save, Globe } from 'lucide-react';
import { api } from '@/services/api';
import { useApi, Card, Badge, Loading, ErrorNote, Empty } from '../primitives.jsx';

export function CompetitorsTab() {
  const { data, loading, error, refetch } = useApi('/admin/seo/competitors');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.competitors) setText(data.competitors.map((c) => c.domain).join('\n'));
  }, [data]);

  if (loading) return <Loading />;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Empty />;

  const save = async () => {
    setSaving(true);
    try {
      const competitors = text.split('\n').map((s) => s.trim()).filter(Boolean);
      await api.put('/admin/seo/competitors', { competitors });
      toast.success('Competitors saved');
      await refetch();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Competitors" subtitle="One domain per line (e.g. cnn.com)">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder={'cnn.com\nreuters.com\napnews.com\nnytimes.com'}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save competitors'}
        </button>
      </Card>

      {data.competitors.length > 0 && (
        <Card title="Tracked competitors">
          <div className="space-y-2">
            {data.competitors.map((c) => (
              <div key={c.domain} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-gray-800">
                <span className="inline-flex items-center gap-2 font-medium">
                  <Globe className="h-4 w-4 text-gray-400" /> {c.domain}
                </span>
                <Badge tone="amber">Needs SEO data provider</Badge>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Pulling a competitor&apos;s ranking topics requires connecting an SEO data provider
            (Ahrefs/SEMrush/DataForSEO). The content-gap analysis below is derived from your own clusters
            and works today.
          </p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Comparison opportunities" subtitle="Clusters missing comparison content">
          {data.comparisonOpportunities.length ? (
            <div className="flex flex-wrap gap-1">
              {data.comparisonOpportunities.map((o) => <Badge key={o} tone="blue">{o}</Badge>)}
            </div>
          ) : <Empty />}
        </Card>
        <Card title="Guide opportunities" subtitle="Clusters missing how-to / ultimate guides">
          {data.guideOpportunities.length ? (
            <div className="flex flex-wrap gap-1">
              {data.guideOpportunities.map((o) => <Badge key={o} tone="blue">{o}</Badge>)}
            </div>
          ) : <Empty />}
        </Card>
        <Card title="FAQ opportunities" subtitle="Clusters missing FAQ content">
          {data.faqOpportunities.length ? (
            <div className="flex flex-wrap gap-1">
              {data.faqOpportunities.map((o) => <Badge key={o} tone="blue">{o}</Badge>)}
            </div>
          ) : <Empty />}
        </Card>
        <Card title="Cluster suggestions">
          {data.clusterSuggestions.length ? (
            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              {data.clusterSuggestions.map((s, i) => <li key={i}>· {s}</li>)}
            </ul>
          ) : <Empty />}
        </Card>
      </div>
    </div>
  );
}
