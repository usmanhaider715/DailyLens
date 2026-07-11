import axios from 'axios';
import { cacheGet, cacheSet } from './cacheService.js';
import { getWeatherForecast } from './weatherService.js';
import { resolveLocation, getWeatherRegionLabel, weatherQueryFromPoint } from '../data/weatherLocations.js';
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

function buildBulletPoints(locationName, today, fiveDay, hourlyByDay = []) {
  const bullets = [];
  bullets.push(
    `${locationName}: ${today.condition} with highs near ${today.high}°C and lows around ${today.low}°C.`,
  );
  if (today.tempNow != null) {
    bullets.push(`Right now ${today.tempNow}°C (feels like ${today.feelsLike}°C).`);
  }

  const todayHours = hourlyByDay[0]?.hours || [];
  const rainyHours = todayHours.filter((h) => (h.precipChance ?? 0) >= 50 && !h.isPast);
  if (rainyHours.length > 0) {
    const times = rainyHours.map((h) => h.hourLabel).join(', ');
    bullets.push(`Rain most likely today around ${times}.`);
  } else if (today.rainChance != null) {
    bullets.push(
      today.rainChance >= 50
        ? `Rain is likely today (${today.rainChance}% chance).`
        : `Rain chance today is ${today.rainChance}% — mostly dry conditions expected.`,
    );
  }
  if (today.windKph != null) {
    bullets.push(
      today.humidity != null
        ? `Wind around ${today.windKph} km/h with ${today.humidity}% humidity.`
        : `Wind around ${today.windKph} km/h.`,
    );
  } else if (today.humidity != null) {
    bullets.push(`Humidity at ${today.humidity}%.`);
  }

  const rainyDays = fiveDay.filter((d) => (d.rainChance ?? 0) >= 50);
  if (rainyDays.length >= 3) {
    bullets.push(`${rainyDays.length} of the next 5 days show elevated rain risk — keep an umbrella handy.`);
  } else if (rainyDays.length === 0) {
    bullets.push('The 5-day outlook stays relatively dry overall.');
  } else {
    bullets.push(`Rain most likely on ${rainyDays.map((d) => d.label).join(', ')}.`);
  }

  const warmest = fiveDay.reduce((best, d) => (d.high > best.high ? d : best), fiveDay[0]);
  const coolest = fiveDay.reduce((best, d) => (d.low < best.low ? d : best), fiveDay[0]);
  if (warmest && coolest && warmest.date !== coolest.date) {
    bullets.push(`Warmest: ${warmest.label} (${warmest.high}°C). Coolest nights: ${coolest.label} (${coolest.low}°C).`);
  }

  return bullets;
}

async function groqPolishNarrative(locationName, payload) {
  if (process.env.WEATHER_USE_GROQ !== '1') return null;
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
              'You are a friendly meteorologist. Return 4-6 short bullet points in plain English. Start each line with "• ". No markdown headers.',
          },
          {
            role: 'user',
            content: `Location: ${locationName}\nForecast JSON:\n${JSON.stringify(payload, null, 2)}\nSummarize today and the next 5 days including rain timing.`,
          },
        ],
      },
      {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 8000,
      },
    );
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    return text
      .split('\n')
      .map((line) => line.replace(/^[\s•\-*]+/, '').trim())
      .filter(Boolean);
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
  const hourlyByDay = fc.hourlyByDay || [];

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

  const bullets = buildBulletPoints(name, today, fiveDay, hourlyByDay);

  return {
    location: loc,
    locationName: name,
    today,
    fiveDay,
    hourlyByDay,
    table,
    bullets,
    narrative: bullets.join(' '),
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

  const cacheKey = `weather:analysis:v3:${point.country}:${point.id}`;
  const cached = await cacheGet(cacheKey);
  if (cached && query.refresh !== '1') return cached;

  const weather = await getWeatherForecast({
    ...weatherQueryFromPoint(point),
    lat: query.lat,
    lon: query.lon,
    includeCatalog: false,
  });

  if (weather.error) return weather;

  const analysis = buildAnalysisFromForecast(weather);
  const aiBullets = await groqPolishNarrative(analysis.locationName, {
    today: analysis.today,
    fiveDay: analysis.fiveDay,
    hourlyByDay: analysis.hourlyByDay,
  });
  if (aiBullets?.length) {
    analysis.bullets = aiBullets;
    analysis.narrative = aiBullets.join(' ');
    analysis.aiEnhanced = true;
  }

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
