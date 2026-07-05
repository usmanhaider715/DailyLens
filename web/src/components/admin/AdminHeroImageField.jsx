'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import { HeroImageSearchModal } from './HeroImageSearchModal.jsx';
import { Spinner } from '../common/Spinner.jsx';
import { fallbackHeroUrl, resolveHeroSrc } from '@/utils/heroImage';
import { isPollinationsUrl } from '@/utils/pollinationsImage';
import { Search, Sparkles, Upload, ExternalLink, Link2, RefreshCw } from 'lucide-react';

const PREVIEW_TIMEOUT_MS = 15000;

const STATUS_COPY = {
  idle: { label: 'AI hero pending', hint: 'An AI image is generated automatically from your headline' },
  generating: { label: 'Generating AI image…', hint: 'Pollinations AI is creating your hero image' },
  loading: { label: 'Loading preview…', hint: 'Fetching hero image' },
  ready: { label: 'Hero image ready', hint: 'This image is shown on the live article' },
  error: { label: 'Preview failed — retry or pick another', hint: 'Try Regenerate AI, paste a direct image URL, or upload' },
};

export default function AdminHeroImageField({
  featuredImage = '',
  heroImageUrl = '',
  heroImageAlt = '',
  heroImageCredit = '',
  heroImageCreditUrl = '',
  heroImageSource = '',
  heroImageUploadFilename = '',
  title = '',
  category = 'World',
  onChange,
  compact = false,
}) {
  const fileRef = useRef(null);
  const autoGenAttempted = useRef(false);
  const previewTimerRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const displayUrl = featuredImage?.trim() || '';
  const previewSrc = displayUrl ? resolveHeroSrc(displayUrl, category) : '';
  const isAiImage = isPollinationsUrl(displayUrl);

  const effectiveStatus = generating
    ? 'generating'
    : previewError
      ? 'error'
      : displayUrl && !previewLoaded
        ? 'loading'
        : displayUrl
          ? 'ready'
          : 'idle';

  const patch = useCallback((fields) => onChange?.({ ...fields }), [onChange]);

  useEffect(() => {
    setUrlInput((current) => current || heroImageUrl || featuredImage || '');
  }, [heroImageUrl, featuredImage]);

  useEffect(() => {
    setPreviewLoaded(false);
    setPreviewError(false);
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    if (!previewSrc) return undefined;

    previewTimerRef.current = setTimeout(() => {
      setPreviewError(true);
    }, PREVIEW_TIMEOUT_MS);

    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [previewSrc]);

  const generateAiImage = useCallback(
    async (silent = false) => {
      if (!title?.trim()) {
        if (!silent) toast.error('Add a headline first');
        return null;
      }
      setGenerating(true);
      setPreviewError(false);
      setPreviewLoaded(false);
      try {
        const { data } = await api.post('/admin/ai/generate-featured-image', {
          title: title.trim(),
          category,
        });
        if (data?.url) {
          patch({ featuredImage: data.url });
          setUrlInput(data.url);
          if (!silent) toast.success('AI hero image generated');
          return data.url;
        }
      } catch (err) {
        if (!silent) toast.error(err?.response?.data?.message || 'Could not generate AI image');
      } finally {
        setGenerating(false);
      }
      return null;
    },
    [title, category, patch],
  );

  useEffect(() => {
    if (featuredImage?.trim() || !title?.trim() || autoGenAttempted.current) return;
    autoGenAttempted.current = true;
    generateAiImage(true);
  }, [featuredImage, title, generateAiImage]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setPreviewError(false);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('title', title || 'Article hero');
      fd.append('slug', title || 'hero');
      fd.append('alt', heroImageAlt || title || 'Article hero image');
      const { data } = await api.post('/admin/upload-hero-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      patch({
        featuredImage: data.url,
        heroImageUrl: data.url,
        heroImageAlt: data.alt || heroImageAlt || title,
        heroImageCredit: data.credit || 'Uploaded image',
        heroImageCreditUrl: '',
        heroImageSource: 'upload',
        heroImageUploadFilename: data.filename || '',
      });
      setUrlInput(data.url);
      toast.success('Hero image uploaded');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const applySearchImage = (img) => {
    patch({
      featuredImage: img.url,
      heroImageUrl: img.url,
      heroImageAlt: img.alt || title,
      heroImageCredit: img.credit || '',
      heroImageCreditUrl: img.creditUrl || '',
      heroImageSource: img.source || 'search',
      heroImageUploadFilename: '',
    });
    setUrlInput(img.url);
    setSearchOpen(false);
    toast.success('Hero image selected');
  };

  const applyImageUrl = () => {
    const url = urlInput.trim();
    if (!url) {
      toast.error('Paste an image URL first');
      return;
    }
    if (!/^https?:\/\//i.test(url) && !url.startsWith('/uploads/')) {
      toast.error('Enter a valid http(s) or upload path URL');
      return;
    }
    setPreviewError(false);
    setPreviewLoaded(false);
    patch({
      featuredImage: url,
      heroImageUrl: url,
      heroImageSource: 'original',
      heroImageUploadFilename: '',
    });
    toast.success('Hero image URL applied');
  };

  const copy = STATUS_COPY[effectiveStatus] || STATUS_COPY.idle;
  const showOverlay = ['generating', 'loading'].includes(effectiveStatus);
  const showPreview = previewSrc && !previewError;

  return (
    <>
      <div className={`rounded-xl border border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-900/40 ${compact ? 'p-3' : 'p-4'}`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Hero image</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{copy.hint}</p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              effectiveStatus === 'ready'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                : effectiveStatus === 'generating' || effectiveStatus === 'loading'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
                  : effectiveStatus === 'error'
                    ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {(effectiveStatus === 'generating' || effectiveStatus === 'loading') && (
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-current" />
            )}
            {copy.label}
            {isAiImage && effectiveStatus === 'ready' ? ' · AI' : ''}
          </span>
        </div>

        <div className={`relative overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800 ${compact ? 'aspect-[16/10]' : 'aspect-[21/9]'}`}>
          {showPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={previewSrc}
              src={previewSrc}
              alt={heroImageAlt || title || 'Hero preview'}
              className={`h-full w-full object-cover transition-opacity duration-500 ${previewLoaded ? 'opacity-100' : 'opacity-0'}`}
              referrerPolicy="no-referrer"
              onLoad={() => {
                if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
                setPreviewLoaded(true);
                setPreviewError(false);
              }}
              onError={() => {
                if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
                setPreviewError(true);
                setPreviewLoaded(false);
              }}
            />
          ) : previewError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fallbackHeroUrl(category)}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-40"
              />
              <div className="relative z-10 rounded-lg bg-black/60 px-4 py-3 text-sm text-white">
                <p className="font-medium">Could not load this image</p>
                <p className="mt-1 text-xs text-white/80">Try Regenerate AI, upload, or use a direct image URL</p>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewError(false);
                    setPreviewLoaded(false);
                  }}
                  className="mt-2 inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-1 text-xs font-semibold hover:bg-white/30"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry preview
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-gray-500 dark:text-gray-400">
              {generating ? (
                <>
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-600" />
                  <span>Creating AI hero image…</span>
                </>
              ) : (
                'AI hero will appear here'
              )}
            </div>
          )}

          {showOverlay && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-900/55 backdrop-blur-[2px]">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <p className="text-sm font-medium text-white">{copy.label}</p>
            </div>
          )}
        </div>

        {!compact && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={generating || !title?.trim()}
              onClick={() => generateAiImage(false)}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-600 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-60 dark:border-violet-500 dark:bg-violet-950/40 dark:text-violet-200"
            >
              {generating ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {generating ? 'Generating…' : 'Regenerate AI'}
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              {uploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              Upload file
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-primary-600 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-800 hover:bg-primary-100 dark:border-primary-500 dark:bg-primary-950/40 dark:text-primary-200"
            >
              <Search className="h-4 w-4" />
              Search hero image
            </button>
            <button
              type="button"
              onClick={() => {
                const q = encodeURIComponent(title?.trim() || category || 'news');
                window.open(`https://www.google.com/search?tbm=isch&q=${q}`, '_blank', 'noopener,noreferrer');
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <ExternalLink className="h-4 w-4" />
              Search manually
            </button>
          </div>
        )}

        {!compact && (
          <div className="mt-3 flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste image URL (https://…)"
              className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800"
            />
            <button
              type="button"
              onClick={applyImageUrl}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-sky-600 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900 hover:bg-sky-100 dark:border-sky-500 dark:bg-sky-950/40 dark:text-sky-200"
            >
              <Link2 className="h-4 w-4" />
              Use URL
            </button>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="hidden" onChange={handleUpload} />

        {!compact && heroImageUrl && heroImageUrl !== featuredImage && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Source image from feed (attribution only):{' '}
            <span className="break-all font-mono text-[10px]">{heroImageUrl}</span>
          </p>
        )}

        {!compact && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={heroImageAlt}
              onChange={(e) => patch({ heroImageAlt: e.target.value })}
              placeholder="Alt text"
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800"
            />
            <input
              type="text"
              value={heroImageCredit}
              onChange={(e) => patch({ heroImageCredit: e.target.value })}
              placeholder="Image credit"
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
        )}
      </div>

      <HeroImageSearchModal
        open={searchOpen}
        title={title}
        category={category}
        currentUrl={featuredImage || heroImageUrl}
        onClose={() => setSearchOpen(false)}
        onSelect={applySearchImage}
      />
    </>
  );
}
