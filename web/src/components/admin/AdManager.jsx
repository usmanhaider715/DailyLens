'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { Spinner } from '../common/Spinner.jsx';

const positions = [
  'leaderboard-top',
  'leaderboard-bottom',
  'sidebar-top',
  'sidebar-mid',
  'in-article',
  'mobile-sticky',
];

export function AdManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: 'New slot',
    position: 'sidebar-top',
    type: 'adsense',
    adsenseSlotId: '',
    customHtml: '',
    isActive: true,
    category: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/ads');
      setItems(data || []);
    } catch {
      toast.error('Failed to load ads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const ctr = (ad) => {
    const imp = ad.impressions || 0;
    const cl = ad.clicks || 0;
    if (!imp) return '0%';
    return `${((cl / imp) * 100).toFixed(2)}%`;
  };

  const save = async () => {
    try {
      await api.post('/admin/ads', form);
      toast.success('Ad slot created');
      setForm({
        name: 'New slot',
        position: 'sidebar-top',
        type: 'adsense',
        adsenseSlotId: '',
        customHtml: '',
        isActive: true,
        category: '',
      });
      load();
    } catch {
      toast.error('Save failed');
    }
  };

  const toggle = async (ad) => {
    try {
      await api.put(`/admin/ads/${ad._id}`, { isActive: !ad.isActive });
      load();
    } catch {
      toast.error('Update failed');
    }
  };

  if (loading && !items.length) return <Spinner />;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Ad Manager</h1>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
        <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2">Position</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Impr.</th>
              <th className="px-3 py-2">Clicks</th>
              <th className="px-3 py-2">CTR</th>
              <th className="px-3 py-2">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((a) => (
              <tr key={a._id} className="bg-white dark:bg-gray-900">
                <td className="px-3 py-2">{a.name}</td>
                <td className="px-3 py-2">{a.position}</td>
                <td className="px-3 py-2">{a.type}</td>
                <td className="px-3 py-2">{a.impressions}</td>
                <td className="px-3 py-2">{a.clicks}</td>
                <td className="px-3 py-2">{ctr(a)}</td>
                <td className="px-3 py-2 text-center">
                  <input type="checkbox" checked={!!a.isActive} onChange={() => toggle(a)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 max-w-xl space-y-3 rounded-xl border border-gray-100 p-4 dark:border-gray-800">
        <h2 className="font-display text-xl font-bold">Create / edit style (new row)</h2>
        <input
          className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <select
          className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          value={form.position}
          onChange={(e) => setForm({ ...form, position: e.target.value })}
        >
          {positions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="adsense">AdSense</option>
          <option value="custom">Custom HTML</option>
        </select>
        {form.type === 'adsense' ? (
          <input
            className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            placeholder="AdSense slot id"
            value={form.adsenseSlotId}
            onChange={(e) => setForm({ ...form, adsenseSlotId: e.target.value })}
          />
        ) : (
          <textarea
            className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            rows={4}
            value={form.customHtml}
            onChange={(e) => setForm({ ...form, customHtml: e.target.value })}
          />
        )}
        <button type="button" onClick={save} className="rounded-lg bg-primary-700 px-4 py-2 text-white">
          Save slot
        </button>
      </div>
    </div>
  );
}
