'use client';

import { useEffect, useRef, useState } from 'react';
import { SHOW_ADS } from '@/config/features';
import { api } from '@/services/api';

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '';

/**
 * Public ad slot. Lazy-loads (only fetches when scrolled near the viewport),
 * always shows an "Advertisement" label, and tracks impressions/clicks.
 * Supports AdSense (auto slots) and custom image/HTML ads from the CMS.
 * Renders nothing unless SHOW_ADS is enabled in config/features.js.
 */
export function AdSlot({ position = 'in-article', category = '', className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [ad, setAd] = useState(null);
  const [tracked, setTracked] = useState(false);

  // Lazy: only activate when the slot approaches the viewport.
  useEffect(() => {
    if (!SHOW_ADS || !ref.current) return;
    const el = ref.current;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Fetch a custom ad once visible (AdSense doesn't need this).
  useEffect(() => {
    if (!visible || ADSENSE_CLIENT) return;
    let cancelled = false;
    api
      .get(`/ads/${encodeURIComponent(position)}`, { params: category ? { category } : {} })
      .then(({ data }) => !cancelled && setAd(data || null))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible, position, category]);

  // Push AdSense once visible.
  useEffect(() => {
    if (!visible || !ADSENSE_CLIENT) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* adblock or not loaded yet */
    }
  }, [visible]);

  // Impression tracking for custom ads.
  useEffect(() => {
    if (ad?._id && !tracked) {
      setTracked(true);
      api.post(`/ads/${ad._id}/impression`).catch(() => {});
    }
  }, [ad, tracked]);

  if (!SHOW_ADS) return null;

  const label = (
    <span className="mb-1 block text-center text-[10px] font-medium uppercase tracking-widest text-gray-400">
      Advertisement
    </span>
  );

  return (
    <div ref={ref} className={className} aria-label="Advertisement">
      {label}
      {visible && ADSENSE_CLIENT && (
        // eslint-disable-next-line jsx-a11y/no-redundant-roles
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot=""
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      )}
      {visible && !ADSENSE_CLIENT && ad && (
        <AdBody ad={ad} />
      )}
    </div>
  );
}

function AdBody({ ad }) {
  const onClick = () => api.post(`/ads/${ad._id}/click`).catch(() => {});

  if (ad.type === 'custom' && ad.customHtml) {
    return <div dangerouslySetInnerHTML={{ __html: ad.customHtml }} onClick={onClick} />;
  }
  if (ad.imageUrl) {
    const img = (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={ad.imageUrl} alt={ad.name || 'Advertisement'} className="mx-auto h-auto max-w-full rounded" />
    );
    return ad.linkUrl ? (
      <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer sponsored" onClick={onClick}>
        {img}
      </a>
    ) : (
      img
    );
  }
  return null;
}
