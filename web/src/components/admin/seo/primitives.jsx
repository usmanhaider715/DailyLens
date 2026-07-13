'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '@/services/api';
import { Spinner } from '../../common/Spinner.jsx';

/** Small data-fetching hook with loading / error / refetch. */
export function useApi(path, { params, method = 'get', body, immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = method === 'get' ? await api.get(path, { params }) : await api[method](path, body);
      setData(res.data);
      return res.data;
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Request failed');
      return null;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, JSON.stringify(params), method, JSON.stringify(body)]);

  useEffect(() => {
    if (immediate) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, immediate]);

  return { data, loading, error, refetch: run, setData };
}

export function healthColor(v) {
  if (v == null) return 'text-gray-400';
  if (v >= 75) return 'text-green-600 dark:text-green-400';
  if (v >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

const TONES = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  primary: 'bg-primary-600',
  gray: 'bg-gray-400',
};

export function Card({ title, subtitle, right, children, className = '' }) {
  return (
    <div
      className={`rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      {(title || right) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h3 className="font-display text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function Stat({ icon: Icon, label, value, tone = '', hint }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500">
        {Icon && <Icon className="h-4 w-4" />} {label}
      </div>
      <div className={`mt-1 font-display text-2xl font-bold text-gray-900 dark:text-white ${tone}`}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-gray-400">{hint}</div>}
    </div>
  );
}

const BADGE_TONES = {
  green: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  red: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  primary: 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300',
};

export function Badge({ children, tone = 'gray', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_TONES[tone] || BADGE_TONES.gray} ${className}`}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value = 0, tone }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const auto = v >= 75 ? 'green' : v >= 40 ? 'amber' : 'red';
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
      <div className={`h-full rounded-full ${TONES[tone || auto]}`} style={{ width: `${v}%` }} />
    </div>
  );
}

export function HealthDot({ value }) {
  const tone = value == null ? 'gray' : value >= 75 ? 'green' : value >= 50 ? 'amber' : 'red';
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${TONES[tone]}`} aria-hidden="true" />;
}

/** Dependency-free bar chart for dashboards. */
export function MiniBars({ data = [], valueKey = 'value', labelKey = 'label', tone = 'primary' }) {
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey]) || 0));
  return (
    <div className="flex items-end gap-2" style={{ height: 120 }}>
      {data.map((d, i) => {
        const h = Math.round(((Number(d[valueKey]) || 0) / max) * 100);
        return (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
            <div
              className={`w-full rounded-t ${TONES[tone]}`}
              style={{ height: `${Math.max(2, h)}%` }}
              title={`${d[labelKey]}: ${d[valueKey]}`}
            />
            <span className="truncate text-[10px] text-gray-400">{d[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Empty({ children = 'Nothing here yet.' }) {
  return <p className="py-6 text-center text-sm text-gray-400">{children}</p>;
}

export function Loading() {
  return (
    <div className="py-10">
      <Spinner />
    </div>
  );
}

export function ErrorNote({ children }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
      {children}
    </div>
  );
}

export function NotConnected({ reason }) {
  return (
    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 px-4 py-6 text-center dark:border-amber-800/60 dark:bg-amber-900/10">
      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Not connected</p>
      <p className="mx-auto mt-1 max-w-xl text-xs text-amber-700/80 dark:text-amber-300/70">{reason}</p>
    </div>
  );
}

function toCsv(rows) {
  if (!rows?.length) return '';
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v) => {
    const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
}

export function ExportButton({ rows, filename = 'export.csv', label = 'Export CSV' }) {
  const onClick = () => {
    const csv = toCsv(rows || []);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!rows?.length}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      <Download className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

export function SectionTable({ columns, rows, empty, keyField }) {
  if (!rows?.length) return <Empty>{empty}</Empty>;
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row, i) => (
            <tr key={keyField ? row[keyField] : i} className="align-top">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2 text-gray-700 dark:text-gray-300">
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
