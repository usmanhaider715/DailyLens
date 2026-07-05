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

async function fetchPointForecast(point) {
  const { data } = await axios.get('https://api.open-meteo.com/v1/forecast', {
    params: {
      latitude: point.lat,
      longitude: point.lon,
      current:
        'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
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

  return {
    location: point,
    name: point.name,
    current: {
      temp: Math.round(data.current?.temperature_2m ?? 0),
      feelsLike: Math.round(data.current?.apparent_temperature ?? 0),
      humidity: data.current?.relative_humidity_2m ?? null,
      windKph: Math.round((data.current?.wind_speed_10m ?? 0) * 3.6),
      condition: wmoLabel(data.current?.weather_code),
      code: data.current?.weather_code,
    },
    daily,
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

  const cacheKey = `weather:point:${point.country}:${point.id}:${Math.round(point.lat * 10)}`;
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
