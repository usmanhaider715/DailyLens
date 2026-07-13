'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Wand2 } from 'lucide-react';
import { api } from '@/services/api';
import { useApi, Card, Badge } from '../primitives.jsx';

const INTENTS = ['informational', 'commercial', 'transactional', 'navigational'];
const inputCls =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white';

export function ManualTab() {
  const { data: config } = useApi('/admin/seo/config');
  const [form, setForm] = useState({
    keyword: '',
    cluster: '',
    category: '',
    targetIntent: 'informational',
    difficulty: '',
    commercialValue: '',
    searchVolume: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.keyword.trim()) return toast.error('Enter a keyword or topic');
    setSubmitting(true);
    try {
      const { data } = await api.post('/admin/seo/manual-generate', form);
      setResult(data);
      toast.success('Generation started — draft will appear under Content ideas → drafts.');
    } catch (err) {
      if (err?.response?.status === 409) {
        toast.error('A generation job is already running. Try again once it finishes.');
      } else {
        toast.error(err?.response?.data?.message || 'Could not start generation');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card
        title="Manual topic generator"
        subtitle="Generate a single article around one specific topic. It runs through the existing draft pipeline for review."
      >
        <form onSubmit={submit} className="space-y-4">
          <Field label="Keyword / topic *">
            <input value={form.keyword} onChange={set('keyword')} placeholder="e.g. best travel insurance for seniors" className={inputCls} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cluster">
              <input value={form.cluster} onChange={set('cluster')} placeholder="e.g. Insurance" className={inputCls} />
            </Field>
            <Field label="Category">
              <select value={form.category} onChange={set('category')} className={inputCls}>
                <option value="">Auto (from cluster)</option>
                {(config?.categoryTargets || []).map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Target intent">
              <select value={form.targetIntent} onChange={set('targetIntent')} className={inputCls}>
                {INTENTS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
            <Field label="Difficulty (0-100)">
              <input type="number" min="0" max="100" value={form.difficulty} onChange={set('difficulty')} className={inputCls} />
            </Field>
            <Field label="Commercial value (0-100)">
              <input type="number" min="0" max="100" value={form.commercialValue} onChange={set('commercialValue')} className={inputCls} />
            </Field>
            <Field label="Search volume (est.)">
              <input type="number" min="0" value={form.searchVolume} onChange={set('searchVolume')} className={inputCls} />
            </Field>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Wand2 className="h-4 w-4" /> {submitting ? 'Starting…' : 'Generate article'}
          </button>
        </form>
      </Card>

      {result && (
        <Card title="Generation started">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Brief: <Badge tone="primary">{result.brief}</Badge>
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Track progress and publish the draft from <b>Auto-share → Content ideas → Evergreen drafts</b>.
          </p>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-xs font-medium text-gray-500">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
