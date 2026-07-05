'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';

const detailCache = new Map();

export function useWeatherCountryDetail(countryId) {
  const [detail, setDetail] = useState(detailCache.get(countryId) || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!countryId) {
      setDetail(null);
      return undefined;
    }
    if (detailCache.has(countryId)) {
      setDetail(detailCache.get(countryId));
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    api
      .get(`/site/weather/regions/${countryId}`)
      .then(({ data }) => {
        detailCache.set(countryId, data);
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [countryId]);

  return { detail, loading };
}

export async function prefetchWeatherCountry(countryId) {
  if (!countryId || detailCache.has(countryId)) return detailCache.get(countryId);
  const { data } = await api.get(`/site/weather/regions/${countryId}`);
  detailCache.set(countryId, data);
  return data;
}
