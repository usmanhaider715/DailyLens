'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearVisitorLocationPrompt,
  detectTimezone,
  hasLocationChoice,
  loadVisitorLocation,
  saveVisitorLocation,
  visitorWeatherParams,
} from '@/utils/visitorLocation';

const VisitorLocationContext = createContext(null);

export function VisitorLocationProvider({ children }) {
  const [location, setLocationState] = useState(null);
  const [ready, setReady] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const saved = loadVisitorLocation();
    setLocationState(saved);
    setShowPrompt(!hasLocationChoice() && !saved?.dismissed);
    setReady(true);
  }, []);

  const persist = useCallback((next) => {
    saveVisitorLocation(next);
    setLocationState(next);
    setShowPrompt(false);
  }, []);

  const requestGeolocation = useCallback(async () => {
    setRequesting(true);
    try {
      if (!navigator.geolocation) throw new Error('Geolocation unavailable');
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 300000,
          enableHighAccuracy: false,
        });
      });
      persist({
        source: 'geo',
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        timezone: detectTimezone(),
      });
      return true;
    } catch {
      return false;
    } finally {
      setRequesting(false);
    }
  }, [persist]);

  const setManualRegion = useCallback(
    (params) => {
      persist({
        source: 'manual',
        country: params.country,
        state: params.state || '',
        cityId: params.cityId || '',
        name: params.name || '',
        timezone: detectTimezone(),
      });
    },
    [persist]
  );

  const dismissPrompt = useCallback(() => {
    clearVisitorLocationPrompt();
    setShowPrompt(false);
    setLocationState(loadVisitorLocation());
  }, []);

  const value = useMemo(
    () => ({
      location,
      ready,
      showPrompt,
      requesting,
      timezone: location?.timezone || detectTimezone(),
      weatherParams: visitorWeatherParams(location),
      requestGeolocation,
      setManualRegion,
      dismissPrompt,
      openPrompt: () => setShowPrompt(true),
    }),
    [location, ready, showPrompt, requesting, requestGeolocation, setManualRegion, dismissPrompt]
  );

  return <VisitorLocationContext.Provider value={value}>{children}</VisitorLocationContext.Provider>;
}

export function useVisitorLocation() {
  const ctx = useContext(VisitorLocationContext);
  if (!ctx) throw new Error('useVisitorLocation must be used within VisitorLocationProvider');
  return ctx;
}
