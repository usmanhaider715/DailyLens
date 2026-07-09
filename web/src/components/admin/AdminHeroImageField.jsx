'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import { HeroImageSearchModal } from './HeroImageSearchModal.jsx';
import { Spinner } from '../common/Spinner.jsx';
import { HeroImage } from '../common/HeroImage.jsx';
import { isPollinationsUrl } from '@/utils/pollinationsImage';
import { isSourceNewsHero, resolveArticleDisplayHero } from '@/utils/articleImage';
import { Search, Sparkles, Upload, ExternalLink, Link2 } from 'lucide-react';

const LONG_TIMEOUT_MS = 120000;

const STATUS_COPY = {
  idle: { label: 'Hero pending', hint: 'Uses source news photo first, then AI, then a pasted URL' },
  generating: { label: 'Generating AI image…', hint: 'Used when no source news photo is available' },
  persisting: { label: 'Saving image…', hint: 'Downloading and compressing the hero image' },
  ready: { label: 'Hero image ready', hint: 'Applied images are saved to the live site automatically' },
  source: { label: 'Source news photo', hint: 'Showing the image from the original news story' },
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
  slug = '',
  category = 'World',
  onChange,
  onSaveHero = null,
  compact = false,
}) {
  const fileRef = useRef(null);
  const autoGenAttempted = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const displayUrl =
    resolveArticleDisplayHero({
      featuredImage,
      heroImageUrl,
      heroImageSource,
      heroImage: { url: heroImageUrl, source: heroImageSource },
    }) || '';
  const usingSourcePhoto = isSourceNewsHero({ url: heroImageUrl, source: heroImageSource }) && displayUrl === heroImageUrl?.trim();
  const isAiImage = isPollinationsUrl(displayUrl) || heroImageSource === 'ai';

  const effectiveStatus = generating
    ? 'generating'
    : persisting
      ? 'persisting'
      : usingSourcePhoto
        ? 'source'
        : displayUrl
          ? 'ready'
          : 'idle';

  const patch = useCallback((fields) => onChange?.({ ...fields }), [onChange]);
  const slugHint = slug?.trim() || title?.trim() || 'hero';

  const applyHero = useCallback(
    async (fields, { toastMessage, autoSave = true } = {}) => {
      patch(fields);
      if (autoSave && onSaveHero) {
        await onSaveHero(fields);
      } else if (toastMessage) {
        toast.success(toastMessage);
      }
    },
    [patch, onSaveHero],
  );

  useEffect(() => {
    setUrlInput((current) => current || heroImageUrl || featuredImage || '');
  }, [heroImageUrl, featuredImage]);

  const persistRemoteUrl = useCallback(
    async (url) => {
      const trimmed = String(url || '').trim();
      if (!trimmed || trimmed.startsWith('/uploads/')) return trimmed;
      setPersisting(true);
      try {
        const { data } = await api.post(
          '/admin/ai/persist-featured-image',
          { url: trimmed, slug: slugHint, title: title?.trim() },
          { timeout: LONG_TIMEOUT_MS },
        );
        return data?.url || trimmed;
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Could not save image locally');
        return trimmed;
      } finally {
        setPersisting(false);
      }
    },
    [slugHint, title],
  );

  const generateAiImage = useCallback(
    async (silent = false) => {
      if (!title?.trim()) {
        if (!silent) toast.error('Add a headline first');
        return null;
      }
      setGenerating(true);
      try {
        const { data } = await api.post(
          '/admin/ai/generate-featured-image',
          {
            title: title.trim(),
            category,
            slug: slugHint,
          },
          { timeout: LONG_TIMEOUT_MS },
        );
        if (data?.url) {
          const keepSource = isSourceNewsHero({ url: heroImageUrl, source: heroImageSource });
          const fields = {
            featuredImage: data.url,
            heroImageUrl: keepSource ? heroImageUrl : data.url,
            heroImageSource: 'ai',
            heroImageUploadFilename: '',
          };
          if (silent) {
            patch(fields);
          } else {
            await applyHero(fields, { toastMessage: 'AI hero image saved' });
          }
          setUrlInput(data.url);
          return data.url;
        }
      } catch (err) {
        if (!silent) toast.error(err?.response?.data?.message || 'Could not generate AI image');
      } finally {
        setGenerating(false);
      }
      return null;
    },
    [title, category, slugHint, patch, applyHero, heroImageUrl, heroImageSource],
  );

  useEffect(() => {
    if (featuredImage?.trim() || !title?.trim() || autoGenAttempted.current) return;
    if (isSourceNewsHero({ url: heroImageUrl, source: heroImageSource })) return;
    autoGenAttempted.current = true;
    generateAiImage(true);
  }, [featuredImage, title, heroImageUrl, heroImageSource, generateAiImage]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('title', title || 'Article hero');
      fd.append('slug', slugHint);
      fd.append('alt', heroImageAlt || title || 'Article hero image');
      const { data } = await api.post('/admin/upload-hero-image', fd, {
        timeout: LONG_TIMEOUT_MS,
      });
      const fields = {
        featuredImage: data.url,
        heroImageUrl: data.url,
        heroImageAlt: data.alt || heroImageAlt || title,
        heroImageCredit: data.credit || 'Uploaded image',
        heroImageCreditUrl: '',
        heroImageSource: 'upload',
        heroImageUploadFilename: data.filename || '',
      };
      setUrlInput(data.url);
      await applyHero(fields, { toastMessage: 'Hero image uploaded' });
    } catch (err) {
      const msg =
        err?.response?.status === 413
          ? 'Image file is too large (max 8 MB)'
          : err?.response?.data?.message || err?.message || 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const applySearchImage = async (img) => {
    setSearchOpen(false);
    const localUrl = await persistRemoteUrl(img.url);
    const fields = {
      featuredImage: localUrl,
      heroImageUrl: localUrl,
      heroImageAlt: img.alt || title,
      heroImageCredit: img.credit || '',
      heroImageCreditUrl: img.creditUrl || '',
      heroImageSource: img.source || 'search',
      heroImageUploadFilename: '',
    };
    setUrlInput(localUrl);
    await applyHero(fields, { toastMessage: 'Hero image selected' });
  };

  const applyImageUrl = async () => {
    const url = urlInput.trim();
    if (!url) {
      toast.error('Paste an image URL first');
      return;
    }
    if (!/^https?:\/\//i.test(url) && !url.startsWith('/uploads/')) {
      toast.error('Enter a valid http(s) or upload path URL');
      return;
    }
    const localUrl = await persistRemoteUrl(url);
    const fields = {
      featuredImage: localUrl,
      heroImageUrl: localUrl,
      heroImageSource: 'manual',
      heroImageUploadFilename: '',
    };
    setUrlInput(localUrl);
    await applyHero(fields, { toastMessage: onSaveHero ? undefined : 'Hero image URL applied — click Save changes' });
  };

  const copy = STATUS_COPY[effectiveStatus] || STATUS_COPY.idle;
  const showOverlay = generating || persisting;

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
              effectiveStatus === 'ready' || effectiveStatus === 'source'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                : effectiveStatus === 'generating' || effectiveStatus === 'persisting'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {showOverlay && (
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-current" />
            )}
            {copy.label}
            {isAiImage && effectiveStatus === 'ready' ? ' · AI' : ''}
            {effectiveStatus === 'source' ? ' · Source' : ''}
          </span>
        </div>

        <div className={`relative overflow-hidden rounded-lg ${compact ? 'aspect-[16/10]' : 'aspect-[21/9]'}`}>
          {displayUrl ? (
            <HeroImage
              url={displayUrl}
              alt={heroImageAlt || title || 'Hero preview'}
              category={category}
              fill
              loading="eager"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-gray-200 px-4 text-center text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
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
              disabled={generating || persisting || !title?.trim()}
              onClick={() => generateAiImage(false)}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-600 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-60 dark:border-violet-500 dark:bg-violet-950/40 dark:text-violet-200"
            >
              {generating ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {generating ? 'Generating…' : 'Regenerate AI'}
            </button>
            <button
              type="button"
              disabled={uploading || persisting}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              {uploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              Upload file
            </button>
            <button
              type="button"
              disabled={persisting}
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
              disabled={persisting}
              onClick={applyImageUrl}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-sky-600 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900 hover:bg-sky-100 disabled:opacity-60 dark:border-sky-500 dark:bg-sky-950/40 dark:text-sky-200"
            >
              <Link2 className="h-4 w-4" />
              {persisting ? 'Saving…' : 'Use URL'}
            </button>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,.heic,.heif" className="hidden" onChange={handleUpload} />

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
