'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import { WeatherForecastPanel } from './WeatherForecastPanel.jsx';

export function WeatherHero({ embedded = false }) {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/site/homepage');
      if (data.heroMode === 'weather' && data.weather) {
        setForecast(data.weather);
      } else {
        const region = data.weatherRegion || 'usa';
        const { data: wx } = await api.get('/site/weather', { params: { region } });
        setForecast(wx);
      }
    } catch {
      setForecast(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  if (loading) {
    const skeleton = (
      <div className={`animate-pulse rounded-2xl bg-sky-900/30 ${embedded ? 'min-h-[380px]' : 'h-[320px]'}`} />
    );
    if (embedded) return skeleton;
    return <section className="mx-auto max-w-7xl px-4 py-8">{skeleton}</section>;
  }

  const panel = <WeatherForecastPanel forecast={forecast} size={embedded ? 'hero' : 'default'} />;
  if (embedded) return panel;
  return <section className="mx-auto max-w-7xl px-4 py-8">{panel}</section>;
}
