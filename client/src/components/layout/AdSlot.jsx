import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api.js';

const publisherId = import.meta.env.VITE_ADSENSE_PUBLISHER_ID;

function loadAdsenseScript() {
  if (typeof window === 'undefined') return;
  if (window.adsbygoogleLoaded) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
  window.adsbygoogleLoaded = true;
}

export function AdSlot({ position, className = '', style = {} }) {
  const [slot, setSlot] = useState(null);
  const insRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/ads/${position}`);
        if (!cancelled) setSlot(data);
      } catch {
        if (!cancelled) setSlot(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [position]);

  useEffect(() => {
    if (!slot?._id) return;
    api.post(`/ads/${slot._id}/impression`).catch(() => {});
  }, [slot?._id]);

  useEffect(() => {
    if (slot?.type === 'adsense' && publisherId && slot.adsenseSlotId && insRef.current) {
      loadAdsenseScript();
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        /* noop */
      }
    }
  }, [slot]);

  if (!slot || !slot.isActive) {
    return (
      <div
        className={`mx-auto flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-400 dark:border-gray-700 dark:bg-gray-900 ${className}`}
        style={style}
      >
        Ad
      </div>
    );
  }

  if (slot.type === 'custom' && slot.customHtml) {
    return (
      <div
        className={`mx-auto overflow-hidden rounded-lg ${className}`}
        style={style}
        dangerouslySetInnerHTML={{ __html: slot.customHtml }}
      />
    );
  }

  if (slot.type === 'adsense' && publisherId && slot.adsenseSlotId) {
    return (
      <div className={`mx-auto ${className}`} style={style}>
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={publisherId}
          data-ad-slot={slot.adsenseSlotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  if (slot.imageUrl) {
    return (
      <a
        href={slot.linkUrl || '#'}
        className={`mx-auto block ${className}`}
        style={style}
        onClick={() => slot._id && api.post(`/ads/${slot._id}/click`).catch(() => {})}
      >
        <img src={slot.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
      </a>
    );
  }

  return null;
}
