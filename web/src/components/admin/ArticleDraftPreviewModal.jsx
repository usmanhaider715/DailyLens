'use client';

import { useEffect, useState } from 'react';
import { X, Pencil, Send } from 'lucide-react';
import { Spinner } from '../common/Spinner.jsx';
import { HeroImage } from '../common/HeroImage.jsx';
import { prepareArticleHtml } from '@/utils/stripHtml';

export function ArticleDraftPreviewModal({
  open,
  draft,
  meta,
  loading,
  onClose,
  onPublish,
  onEdit,
}) {
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading && !publishing) onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, loading, publishing, onClose]);

  if (!open) return null;

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await onPublish();
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-preview-title"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-950 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary-700 dark:text-primary-400">
              Preview before publish
            </p>
            <h2 id="draft-preview-title" className="mt-1 font-display text-xl font-bold text-gray-900 dark:text-white">
              Review AI article
            </h2>
            {meta?.sourceName && (
              <p className="mt-1 text-xs text-gray-500">
                Source: {meta.sourceName}
                {meta.sourceTitle ? ` · ${meta.sourceTitle}` : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading || publishing}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Spinner />
              <p className="text-sm text-gray-600">Writing article & finding free-use hero image…</p>
            </div>
          ) : draft ? (
            <div className="space-y-5">
              {draft.heroImageUrl && (
                <figure className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                  <HeroImage
                    url={draft.heroImageUrl}
                    alt={draft.heroImageAlt || draft.title}
                    category={draft.category}
                    className="h-48 w-full object-cover sm:h-56"
                    width={800}
                    height={450}
                  />
                  <figcaption className="px-3 py-2 text-[11px] text-gray-500">
                    {draft.heroImageCredit || 'Image credit'}
                    {draft.heroImageLicense ? ` · ${draft.heroImageLicense}` : ''}
                  </figcaption>
                </figure>
              )}

              <div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {draft.category}
                </span>
                <h3 className="mt-2 font-display text-2xl font-bold leading-snug text-gray-900 dark:text-white">
                  {draft.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{draft.summary}</p>
                <p className="mt-2 text-xs text-gray-400">
                  SEO {draft.seoScore}/10 · {draft.readTime || 3} min read
                  {draft.isBreaking ? ' · Breaking' : ''}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-900/50">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Body preview</p>
                <div
                  className="article-content-wrap max-h-64 overflow-y-auto text-sm leading-relaxed text-gray-700 dark:text-gray-300"
                  dangerouslySetInnerHTML={{
                    __html: prepareArticleHtml((draft.body || '').slice(0, 12000)),
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-gray-500">No draft to preview.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading || publishing}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium dark:border-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onEdit}
            disabled={loading || !draft || publishing}
            className="inline-flex items-center gap-2 rounded-lg border border-primary-600 px-4 py-2.5 text-sm font-semibold text-primary-800 dark:text-primary-300"
          >
            <Pencil className="h-4 w-4" />
            Edit in editor
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={loading || !draft || publishing}
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-50"
          >
            {publishing ? <Spinner className="h-4 w-4 border-white/30 border-t-white" /> : <Send className="h-4 w-4" />}
            Publish now
          </button>
        </div>
      </div>
    </div>
  );
}
