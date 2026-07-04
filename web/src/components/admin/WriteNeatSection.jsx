'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { Sparkles } from 'lucide-react';
import { Spinner } from '../common/Spinner.jsx';
import { ArticleDraftPreviewModal } from './ArticleDraftPreviewModal.jsx';
import { draftToEditorForm } from '@/utils/adminDraft';

const categories = [
  'World',
  'Technology',
  'Business',
  'Sports',
  'Health',
  'Science',
  'Entertainment',
  'Politics',
  'Crypto',
  'Weather',
];

export function WriteNeatSection({ onApplyToForm, onPublished }) {
  const [roughText, setRoughText] = useState('');
  const [category, setCategory] = useState('World');
  const [sourceNote, setSourceNote] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDraft, setPreviewDraft] = useState(null);
  const [publishing, setPublishing] = useState(false);

  const handleWrite = async () => {
    const text = roughText.trim();
    if (text.length < 80) {
      toast.error('Paste at least a few sentences of rough notes (80+ characters).');
      return;
    }
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewDraft(null);
    try {
      const { data } = await api.post('/admin/ai/generate-from-rough-text', {
        roughText: text,
        category,
        sourceName: sourceNote || 'Admin source notes',
      });
      setPreviewDraft(data);
    } catch (err) {
      setPreviewOpen(false);
      toast.error(err?.response?.data?.message || 'Could not write article');
    } finally {
      setPreviewLoading(false);
    }
  };

  const applyToForm = () => {
    if (!previewDraft) return;
    onApplyToForm(draftToEditorForm(previewDraft));
    setPreviewOpen(false);
    toast.success('Neat article applied to the form below — review and publish');
  };

  const handlePublish = async () => {
    if (!previewDraft) return;
    setPublishing(true);
    try {
      await api.post('/admin/articles', {
        title: previewDraft.title,
        summary: previewDraft.summary,
        body: previewDraft.body,
        category: previewDraft.category,
        tags: previewDraft.tags || [],
        author: 'The Daily Lens Desk',
        heroImage: previewDraft.heroImageUrl
          ? {
              url: previewDraft.heroImageUrl,
              alt: previewDraft.heroImageAlt || previewDraft.title,
              credit: previewDraft.heroImageCredit || '',
              creditUrl: previewDraft.heroImageCreditUrl || '',
              source: previewDraft.heroImageSource || 'original',
            }
          : undefined,
        isPublished: true,
        seoScore: previewDraft.seoScore ?? 7,
        readTime: previewDraft.readTime,
        isBreaking: !!previewDraft.isBreaking,
        originalTitle: roughText.split('\n')[0]?.slice(0, 200),
      });
      toast.success('Article published');
      setPreviewOpen(false);
      setRoughText('');
      onPublished?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <section className="rounded-xl border-2 border-dashed border-primary-300 bg-primary-50/40 p-5 dark:border-primary-700 dark:bg-primary-950/20">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">Write neat</h2>
        </div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Paste rough notes copied from another source. Groq rewrites them into a full SEO article — preview first,
          then publish or edit below.
        </p>

        <label className="mt-4 block text-sm font-medium text-gray-800 dark:text-gray-200">
          Rough source text *
          <textarea
            rows={8}
            value={roughText}
            onChange={(e) => setRoughText(e.target.value)}
            placeholder="Paste headlines, paragraphs, bullet points, or quotes from your source…"
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-800 dark:text-gray-200">
            Category hint
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-800 dark:text-gray-200">
            Source label (optional)
            <input
              value={sourceNote}
              onChange={(e) => setSourceNote(e.target.value)}
              placeholder="e.g. BBC, press release"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleWrite}
          disabled={previewLoading}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-50"
        >
          {previewLoading ? <Spinner className="h-4 w-4 border-white/30 border-t-white" /> : <Sparkles className="h-4 w-4" />}
          Write neat with AI
        </button>
      </section>

      <ArticleDraftPreviewModal
        open={previewOpen}
        draft={previewDraft}
        meta={{ sourceName: sourceNote || 'Write neat', label: 'Rough notes' }}
        loading={previewLoading}
        onClose={() => !previewLoading && !publishing && setPreviewOpen(false)}
        onPublish={handlePublish}
        onEdit={applyToForm}
      />
    </>
  );
}
