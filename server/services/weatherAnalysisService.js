import axios from 'axios';
import { cacheGet, cacheSet } from './cacheService.js';
import { getWeatherForecast } from './weatherService.js';
import { resolveLocation, getWeatherRegionLabel } from '../data/weatherLocations.js';
import { logger } from '../utils/logger.js';

function formatDayLabel(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
}

function rainOutlook(pct) {
  if (pct == null) return 'Low';
  if (pct >= 70) return 'High';
  if (pct >= 40) return 'Moderate';
  return 'Low';
}

function buildTemplateNarrative(locationName, today, fiveDay) {
  const rainToday = today.rainChance;
  const rainyDays = fiveDay.filter((d) => (d.rainChance ?? 0) >= 50).length;
  let rainBit =
    rainToday != null && rainToday >= 50
      ? `Rain is likely today (${rainToday}% chance).`
      : rainToday != null
        ? `Rain chance today is ${rainToday}% — mostly dry conditions expected.`
        : 'Rain chances today are limited.';
  if (rainyDays >= 3) {
    rainBit += ` ${rainyDays} of the next 5 days show elevated rain risk — keep an umbrella handy.`;
  } else if (rainyDays === 0) {
    rainBit += ' The 5-day outlook stays relatively dry overall.';
  }
  return `${locationName}: ${today.condition} with highs near ${today.high}° and lows around ${today.low}°. ${rainBit} Data source: Open-Meteo numerical forecast, summarized by The Daily Lens.`;
}

async function groqPolishNarrative(locationName, payload) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const { data } = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          {
            role: 'system',
            content:
              'You are a friendly meteorologist. Write 2 short paragraphs in plain English for the public. No markdown. No bullet lists.',
          },
          {
            role: 'user',
            content: `Location: ${locationName}\nForecast JSON:\n${JSON.stringify(payload, null, 2)}\nExplain today and the next 5 days including rain timing in simple terms.`,
          },
        ],
      },
      {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    logger.warn('Weather Groq narrative skipped:', err.message);
    return null;
  }
}

export function buildAnalysisFromForecast(weatherPayload) {
  const loc = weatherPayload.location || weatherPayload.forecast?.location;
  const fc = weatherPayload.forecast || weatherPayload;
  const name = loc?.name || fc.name || 'Selected location';
  const daily = fc.daily || [];
  const current = fc.current || {};

  const todayRow = daily[0] || {};
  const today = {
    date: todayRow.date || new Date().toISOString().slice(0, 10),
    label: 'Today',
    high: todayRow.high ?? current.temp,
    low: todayRow.low ?? current.temp,
    condition: todayRow.condition || current.condition || 'Variable',
    rainChance: todayRow.precipChance ?? null,
    rainOutlook: rainOutlook(todayRow.precipChance),
    windKph: current.windKph ?? null,
    humidity: current.humidity ?? null,
    tempNow: current.temp ?? todayRow.high,
    feelsLike: current.feelsLike ?? current.temp,
  };

  const fiveDay = daily.slice(0, 5).map((d, i) => ({
    date: d.date,
    label: formatDayLabel(d.date),
    dayIndex: i,
    high: d.high,
    low: d.low,
    condition: d.condition,
    rainChance: d.precipChance,
    rainOutlook: rainOutlook(d.precipChance),
  }));

  const table = {
    today: [
      { label: 'Location', value: name },
      { label: 'Right now', value: `${today.tempNow}°C (feels ${today.feelsLike}°C)` },
      { label: 'Conditions', value: today.condition },
      { label: 'High / Low', value: `${today.high}°C / ${today.low}°C` },
      { label: 'Rain chance', value: today.rainChance != null ? `${today.rainChance}% (${today.rainOutlook})` : '—' },
      { label: 'Wind', value: today.windKph != null ? `${today.windKph} km/h` : '—' },
      { label: 'Humidity', value: today.humidity != null ? `${today.humidity}%` : '—' },
    ],
    fiveDay,
  };

  const narrative = buildTemplateNarrative(name, today, fiveDay);

  return {
    location: loc,
    locationName: name,
    today,
    fiveDay,
    table,
    narrative,
    source: 'Open-Meteo',
    analyzedAt: new Date().toISOString(),
  };
}

export async function getWeatherAnalysis(query = {}) {
  const point = resolveLocation({
    country: query.country,
    state: query.state,
    cityId: query.cityId,
    lat: query.lat,
    lon: query.lon,
  });

  if (!point) {
    return { error: 'Location not found' };
  }

  const cacheKey = `weather:analysis:${point.country}:${point.id}`;
  const cached = await cacheGet(cacheKey);
  if (cached && query.refresh !== '1') return cached;

  const weather = await getWeatherForecast({
    country: point.country,
    state: point.country === 'us' ? point.id : undefined,
    cityId: point.country !== 'us' ? point.id : undefined,
    lat: query.lat,
    lon: query.lon,
  });

  if (weather.error) return weather;

  const analysis = buildAnalysisFromForecast(weather);
  const aiNarrative = await groqPolishNarrative(analysis.locationName, {
    today: analysis.today,
    fiveDay: analysis.fiveDay,
  });
  if (aiNarrative) analysis.narrative = aiNarrative;
  analysis.aiEnhanced = !!aiNarrative;

  analysis.seo = {
    title: `${analysis.locationName} Weather Forecast & 5-Day Outlook`,
    description: `Today's weather in ${analysis.locationName}: ${analysis.today.condition}, ${analysis.today.tempNow}°C. 5-day forecast with rain chances — easy analysis by The Daily Lens.`,
    keywords: [
      `${analysis.locationName} weather`,
      'weather forecast',
      'rain chance',
      '5 day forecast',
      getWeatherRegionLabel(point.country),
    ],
  };

  await cacheSet(cacheKey, analysis, 1800);
  return analysis;
}
