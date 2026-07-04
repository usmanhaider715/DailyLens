'use client';

import { useEffect, useState } from 'react';
import { X, ImageIcon } from 'lucide-react';
import { api } from '@/services/api';
import { Spinner } from '../common/Spinner.jsx';

export function HeroImageSearchModal({ open, title, category, currentUrl, onClose, onSelect }) {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [hint, setHint] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setImages([]);
      try {
        const { data } = await api.get('/admin/ai/search-hero-images', {
          params: {
            title: title || 'news',
            category: category || 'World',
            excludeUrl: currentUrl || '',
          },
        });
        if (!cancelled) {
          setImages(data.images || []);
          setHint(data.hint || null);
        }
      } catch {
        if (!cancelled) setHint('Search failed. Try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, title, category, currentUrl]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-950">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary-700" />
            <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">
              Free-use hero images
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="px-5 pt-3 text-xs text-gray-500">
          Wikimedia Commons, Google Images (CC filter), and Unsplash. Click an image to use it.
        </p>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : images.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">{hint || 'No images found.'}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
              {images.map((img) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => onSelect(img)}
                  className="group overflow-hidden rounded-xl border border-gray-200 text-left transition hover:border-primary-500 hover:ring-2 hover:ring-primary-300 dark:border-gray-700"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.alt || 'Hero option'}
                    className="h-28 w-full object-cover transition group-hover:opacity-90 sm:h-32"
                  />
                  <div className="px-2 py-1.5">
                    <p className="text-[10px] font-semibold uppercase text-gray-500">{img.source}</p>
                    <p className="line-clamp-1 text-[11px] text-gray-600 dark:text-gray-400">{img.credit}</p>
                    {img.license && (
                      <p className="line-clamp-1 text-[10px] text-gray-400">{img.license}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
