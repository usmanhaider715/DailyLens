'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileText, X } from 'lucide-react';
import { buildSourceNewsBrief } from '@/utils/sourceNewsBrief';

export function SourceNewsBriefButton({ article }) {
  const brief = useMemo(() => buildSourceNewsBrief(article), [article]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!brief.hasBrief) return null;

  const buttonPreview =
    brief.oneLiner.length > 72 ? `${brief.oneLiner.slice(0, 72).trim()}…` : brief.oneLiner;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group mt-5 flex w-full items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-left transition hover:border-primary-300 hover:bg-primary-50/50 dark:border-gray-700 dark:bg-gray-900/60 dark:hover:border-primary-700 dark:hover:bg-primary-950/30"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-primary-700 shadow-sm dark:bg-gray-800 dark:text-primary-400">
          <FileText className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-primary-700 dark:text-primary-400">
            Source headline
          </span>
          <span className="mt-0.5 block text-sm font-medium leading-snug text-gray-800 group-hover:text-gray-900 dark:text-gray-200 dark:group-hover:text-white">
            {buttonPreview}
          </span>
          <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
            Tap for one-line summary & key points
          </span>
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="source-brief-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <div>
                <p
                  id="source-brief-title"
                  className="text-[10px] font-bold uppercase tracking-widest text-primary-700 dark:text-primary-400"
                >
                  Source report
                </p>
                <h2 className="mt-1 font-display text-lg font-bold text-gray-900 dark:text-white">
                  At a glance
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Headline</p>
                <p className="mt-1.5 text-base font-medium leading-relaxed text-gray-900 dark:text-gray-100">
                  {brief.oneLiner}
                </p>
              </div>

              {brief.bullets.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Key points</p>
                  <ul className="mt-2 space-y-2">
                    {brief.bullets.map((item, i) => (
                      <li
                        key={i}
                        className="flex gap-2 text-sm leading-snug text-gray-700 dark:text-gray-300"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600 dark:bg-primary-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(brief.sourceUrl || brief.sourceName) && (
                <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
                  {brief.sourceName && (
                    <p className="text-xs text-gray-500">
                      Source: <span className="font-medium text-gray-700 dark:text-gray-300">{brief.sourceName}</span>
                    </p>
                  )}
                  {brief.sourceUrl && /^https?:\/\//i.test(brief.sourceUrl) && (
                    <a
                      href={brief.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline dark:text-primary-400"
                    >
                      Read original report
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
