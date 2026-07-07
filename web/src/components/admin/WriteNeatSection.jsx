'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { Sparkles } from 'lucide-react';
import { Spinner } from '../common/Spinner.jsx';
import { ArticleDraftPreviewModal } from './ArticleDraftPreviewModal.jsx';
import BatchArticleReviewPanel from './BatchArticleReviewPanel.jsx';
import { draftToEditorForm } from '@/utils/adminDraft';
import { splitRoughNotes, MAX_BATCH } from '@/utils/batchPublish';

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
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewItems, setReviewItems] = useState([]);

  const noteBlocks = splitRoughNotes(roughText);
  const multiMode = noteBlocks.length > 1;

  const handleWrite = async () => {
    const text = roughText.trim();
    if (text.length < 80) {
      toast.error('Paste at least a few sentences of rough notes (80+ characters).');
      return;
    }

    if (multiMode) {
      if (noteBlocks.length > MAX_BATCH) {
        toast.error(`Maximum ${MAX_BATCH} articles per batch — split into smaller groups`);
        return;
      }
      const items = noteBlocks.map((block, index) => {
        const firstLine = block.split(/\n/).find((l) => l.trim().length > 10)?.trim() || `Draft ${index + 1}`;
        return {
          title: firstLine.slice(0, 200),
          description: block.slice(0, 600),
          content: block,
          url: `https://www.thedailylens.space/admin/drafts/write-neat-${Date.now()}-${index}`,
          sourceName: sourceNote || 'Write neat notes',
          sourceUrl: '',
          publishedAt: new Date().toISOString(),
          suggestedCategory: category,
        };
      });
      setReviewItems(items);
      setReviewOpen(true);
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
        featuredImage: previewDraft.featuredImage || '',
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
          Paste rough notes — Groq rewrites them into a full SEO article. For listicles (e.g.{' '}
          <em>Top 5 Jackie Chan action movies</em>), each item gets its own section with bullet-style
          headings and free Creative Commons images from Google/Wikimedia. Preview first, then publish.
          Separate multiple articles with a line containing only{' '}
          <code className="rounded bg-white/80 px-1 dark:bg-gray-900">---</code>.
        </p>

        {multiMode ? (
          <p className="mt-2 text-sm font-medium text-primary-800 dark:text-primary-200">
            Detected {noteBlocks.length} articles — generate drafts for review (max {MAX_BATCH}).
          </p>
        ) : null}

        <label className="mt-4 block text-sm font-medium text-gray-800 dark:text-gray-200">
          Rough source text *
          <textarea
            rows={8}
            value={roughText}
            onChange={(e) => setRoughText(e.target.value)}
            placeholder="Paste headlines, list items, or notes… e.g. Top 5 Jackie Chan action movies: 1. Police Story 2. Project A …"
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
          disabled={previewLoading || publishing}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-50"
        >
          {previewLoading ? <Spinner className="h-4 w-4 border-white/30 border-t-white" /> : <Sparkles className="h-4 w-4" />}
          {multiMode ? `Generate ${noteBlocks.length} drafts for review` : 'Write neat with AI'}
        </button>
      </section>

      <BatchArticleReviewPanel
        open={reviewOpen}
        items={reviewItems}
        onClose={() => {
          setReviewOpen(false);
          setReviewItems([]);
        }}
        onPublished={() => {
          setRoughText('');
          onPublished?.();
        }}
      />

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
