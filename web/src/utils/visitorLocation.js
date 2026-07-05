const STORAGE_KEY = 'dailylens-visitor-location';

export function loadVisitorLocation() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveVisitorLocation(data) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
}

export function clearVisitorLocationPrompt() {
  const existing = loadVisitorLocation();
  if (existing?.source) return;
  saveVisitorLocation({ source: 'dismissed', dismissed: true });
}

export function hasLocationChoice() {
  const loc = loadVisitorLocation();
  return Boolean(loc && (loc.source === 'geo' || loc.source === 'manual'));
}

export function visitorWeatherParams(loc) {
  if (!loc) return null;
  if (loc.lat != null && loc.lon != null) return { lat: loc.lat, lon: loc.lon };
  if (loc.country === 'us' && loc.state) return { country: 'us', state: loc.state };
  if (loc.country && loc.cityId) return { country: loc.country, cityId: loc.cityId };
  if (loc.country === 'uk' && loc.cityId) return { country: 'uk', cityId: loc.cityId };
  return null;
}

export function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
