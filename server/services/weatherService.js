import axios from 'axios';
import { cacheGet, cacheSet } from './cacheService.js';
import {
  getLocationCatalog,
  resolveLocation,
  findNearestLocation,
  getLocationCatalogCountry,
} from '../data/weatherLocations.js';

const WMO_LABELS = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Moderate showers',
  82: 'Violent showers',
  95: 'Thunderstorm',
};

function wmoLabel(code) {
  return WMO_LABELS[code] ?? 'Variable';
}

function formatHourLabel(isoLocal) {
  const timePart = isoLocal.split('T')[1] || '00:00';
  const [h, min] = timePart.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(min).padStart(2, '0')} ${period}`;
}

function formatDayLabelFromDate(dateStr, todayDateStr) {
  if (dateStr === todayDateStr) return 'Today';
  const today = new Date(`${todayDateStr}T12:00:00`);
  const target = new Date(`${dateStr}T12:00:00`);
  const diff = Math.round((target - today) / 86400000);
  if (diff === 1) return 'Tomorrow';
  return target.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
}

function parseHourlyForecast(data, daily) {
  const times = data.hourly?.time || [];
  if (!times.length) return [];

  const todayDateStr = daily[0]?.date || times[0]?.slice(0, 10);
  const currentTime = data.current?.time || null;
  const byDay = new Map();

  times.forEach((isoLocal, i) => {
    const date = isoLocal.slice(0, 10);
    const hour = {
      time: isoLocal,
      hourLabel: formatHourLabel(isoLocal),
      temp: Math.round(data.hourly.temperature_2m?.[i] ?? 0),
      feelsLike: Math.round(data.hourly.apparent_temperature?.[i] ?? 0),
      precipChance: data.hourly.precipitation_probability?.[i] ?? null,
      precipMm: data.hourly.precipitation?.[i] ?? null,
      condition: wmoLabel(data.hourly.weather_code?.[i]),
      code: data.hourly.weather_code?.[i],
      windKph: Math.round((data.hourly.wind_speed_10m?.[i] ?? 0) * 3.6),
      humidity: data.hourly.relative_humidity_2m?.[i] ?? null,
      isNow: currentTime === isoLocal,
      isPast: date === todayDateStr && currentTime && isoLocal < currentTime,
    };

    if (!byDay.has(date)) byDay.set(date, []);
    byDay.get(date).push(hour);
  });

  return Array.from(byDay.entries()).map(([date, hours], dayIndex) => {
    const dailyRow = daily.find((d) => d.date === date) || {};
    return {
      date,
      label: formatDayLabelFromDate(date, todayDateStr),
      dayIndex,
      high: dailyRow.high ?? null,
      low: dailyRow.low ?? null,
      condition: dailyRow.condition ?? hours[Math.floor(hours.length / 2)]?.condition,
      rainChance: dailyRow.precipChance ?? null,
      hours,
    };
  });
}

async function fetchPointForecast(point) {
  const { data } = await axios.get('https://api.open-meteo.com/v1/forecast', {
    params: {
      latitude: point.lat,
      longitude: point.lon,
      current:
        'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
      hourly:
        'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m',
      daily:
        'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      timezone: point.timezone || 'auto',
      forecast_days: 5,
    },
    timeout: 12000,
  });

  const daily = (data.daily?.time || []).map((date, i) => ({
    date,
    high: Math.round(data.daily.temperature_2m_max[i]),
    low: Math.round(data.daily.temperature_2m_min[i]),
    precipChance: data.daily.precipitation_probability_max?.[i] ?? null,
    condition: wmoLabel(data.daily.weather_code?.[i]),
    code: data.daily.weather_code?.[i],
  }));

  const hourlyByDay = parseHourlyForecast(data, daily);

  return {
    location: point,
    name: point.name,
    timezone: data.timezone || point.timezone,
    current: {
      temp: Math.round(data.current?.temperature_2m ?? 0),
      feelsLike: Math.round(data.current?.apparent_temperature ?? 0),
      humidity: data.current?.relative_humidity_2m ?? null,
      windKph: Math.round((data.current?.wind_speed_10m ?? 0) * 3.6),
      condition: wmoLabel(data.current?.weather_code),
      code: data.current?.weather_code,
      time: data.current?.time ?? null,
    },
    daily,
    hourlyByDay,
  };
}

/** Single-location forecast (user's area or selected dropdown). */
export async function getWeatherForecast(query = {}) {
  const point = resolveLocation({
    country: query.country,
    state: query.state,
    cityId: query.cityId,
    lat: query.lat,
    lon: query.lon,
  });

  if (!point) {
    return { error: 'Location not found', catalog: getLocationCatalog() };
  }

  const cacheKey = `weather:point:v2:${point.country}:${point.id}:${Math.round(point.lat * 10)}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    if (query.includeCatalog === false && cached.catalog) {
      const { catalog: _c, ...rest } = cached;
      return rest;
    }
    return cached;
  }

  const forecast = await fetchPointForecast(point);
  const payload = {
    mode: 'single',
    location: point,
    forecast,
    catalog: query.includeCatalog === false ? undefined : getLocationCatalog(),
    updatedAt: new Date().toISOString(),
  };

  await cacheSet(cacheKey, { ...payload, catalog: getLocationCatalog() }, 1800);
  if (query.includeCatalog === false) {
    const { catalog: _c, ...rest } = payload;
    return rest;
  }
  return payload;
}

export function getWeatherRegions() {
  return getLocationCatalog();
}

export function getWeatherRegionCountry(countryId) {
  return getLocationCatalogCountry(countryId);
}

export { getLocationCatalog, findNearestLocation };
