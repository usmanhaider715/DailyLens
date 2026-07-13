'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Brain, Sparkles, Zap } from 'lucide-react';
import { api } from '@/services/api';
import { useApi, Card, Badge, Empty, ErrorNote } from '../primitives.jsx';

const PRIORITY_META = {
  high: { tone: 'red', label: 'High priority' },
  medium: { tone: 'amber', label: 'Medium priority' },
  low: { tone: 'gray', label: 'Low priority' },
};

function IdeaCard({ idea, onGenerate, busy }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{idea.title}</p>
        {idea.roiScore ? <Badge tone="primary">ROI {idea.roiScore}</Badge> : null}
      </div>
      <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
        {idea.cluster && <Badge tone="blue">{idea.cluster}</Badge>}
        {idea.searchIntent && <Badge tone="gray">{idea.searchIntent}</Badge>}
        {idea.targetKeyword && <Badge tone="gray">{idea.targetKeyword}</Badge>}
      </div>
      {idea.why && <p className="mt-2 text-xs italic text-gray-500">“{idea.why}”</p>}
      {idea.scores && Object.keys(idea.scores).length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-gray-400 sm:grid-cols-4">
          {Object.entries(idea.scores).map(([k, v]) => (
            <span key={k}>{k}: <b className="text-gray-600 dark:text-gray-300">{v}</b></span>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => onGenerate(idea)}
        disabled={busy}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <Sparkles className="h-3.5 w-3.5" /> {busy ? 'Starting…' : 'Generate this'}
      </button>
    </div>
  );
}

export function PlannerTab() {
  const { data: config } = useApi('/admin/seo/config');
  const [plan, setPlan] = useState(null);
  const [running, setRunning] = useState(false);
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);

  const run = async () => {
    setRunning(true);
    setErr(null);
    try {
      const { data } = await api.post('/admin/seo/plan', { category: category || null });
      setPlan(data);
    } catch (e) {
      setErr(e?.response?.data?.message || 'Planner failed');
    } finally {
      setRunning(false);
    }
  };

  const generate = async (idea) => {
    setBusy(idea.title);
    try {
      await api.post('/admin/seo/manual-generate', {
        keyword: idea.targetKeyword || idea.title,
        cluster: idea.cluster,
        category: idea.cluster || category || undefined,
        targetIntent: idea.searchIntent,
      });
      toast.success(`Started generating "${idea.title}".`);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not start generation');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="AI Planner"
        subtitle="Analyzes clusters, keywords, content gaps and (if connected) Search Console, then ranks the highest-ROI ideas — each with a reason."
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-gray-500">
            Focus category (optional)
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="">All categories</option>
              {(config?.categoryTargets || []).map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Brain className="h-4 w-4" /> {running ? 'Analyzing…' : 'Run AI planner'}
          </button>
        </div>
      </Card>

      {err && <ErrorNote>{err}</ErrorNote>}

      {plan && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <Badge tone={plan.source === 'ai' ? 'green' : 'gray'}>
              <Zap className="h-3 w-3" /> {plan.source === 'ai' ? `AI (${plan.model})` : 'Rule-based'}
            </Badge>
            {plan.costUsd ? <Badge tone="gray">${plan.costUsd.toFixed(4)}</Badge> : null}
            <span>Signals: {plan.signalsUsed.incompleteClusters} clusters, {plan.signalsUsed.missingKeywordGroups} keyword gaps, {plan.signalsUsed.contentIssues} content issues{plan.signalsUsed.searchConsole ? ', GSC connected' : ''}</span>
            {plan.aiError && <Badge tone="amber">AI fallback: {plan.aiError}</Badge>}
          </div>

          {['high', 'medium', 'low'].map((tier) => (
            <div key={tier}>
              <div className="mb-2 flex items-center gap-2">
                <Badge tone={PRIORITY_META[tier].tone}>{PRIORITY_META[tier].label}</Badge>
                <span className="text-xs text-gray-400">{plan.plan[tier].length} ideas</span>
              </div>
              {plan.plan[tier].length === 0 ? (
                <Empty>No {tier}-priority ideas.</Empty>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {plan.plan[tier].map((idea, i) => (
                    <IdeaCard key={i} idea={idea} onGenerate={generate} busy={busy === idea.title} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {!plan && !running && (
        <p className="text-sm text-gray-400">
          <Sparkles className="mr-1 inline h-4 w-4" /> Run the planner to get ranked, justified topic recommendations.
        </p>
      )}
    </div>
  );
}
