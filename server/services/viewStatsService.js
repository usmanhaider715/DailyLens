import { ViewBucket } from '../models/ViewBucket.js';
import {
  getEasternDateParts,
  listEasternDayKeys,
  listEasternHourKeys,
} from '../utils/usEasternTime.js';

export async function recordArticleView() {
  const now = new Date();
  const parts = getEasternDateParts(now);
  const hourKey = `${parts.dateKey}-${String(parts.hour).padStart(2, '0')}`;
  const dayKey = parts.dateKey;

  await Promise.all([
    ViewBucket.updateOne({ granularity: 'hour', bucketKey: hourKey }, { $inc: { views: 1 } }, { upsert: true }),
    ViewBucket.updateOne({ granularity: 'day', bucketKey: dayKey }, { $inc: { views: 1 } }, { upsert: true }),
  ]);
}

function labelForHourKey(key) {
  const [date, hour] = key.split('-');
  const h = Number(hour);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${date.slice(5)} ${h12}${ampm}`;
}

function labelForDayKey(key) {
  const [, month, day] = key.split('-');
  return `${Number(month)}/${Number(day)}`;
}

async function seriesForKeys(granularity, keys, labelFn) {
  const docs = await ViewBucket.find({ granularity, bucketKey: { $in: keys } }).lean();
  const map = new Map(docs.map((d) => [d.bucketKey, d.views || 0]));
  return keys.map((key) => ({
    key,
    label: labelFn(key),
    views: map.get(key) || 0,
  }));
}

export async function getViewsChartSeries() {
  const hourKeys = listEasternHourKeys(24);
  const weekKeys = listEasternDayKeys(7);
  const monthKeys = listEasternDayKeys(30);

  const [hours24, days7, days30] = await Promise.all([
    seriesForKeys('hour', hourKeys, labelForHourKey),
    seriesForKeys('day', weekKeys, labelForDayKey),
    seriesForKeys('day', monthKeys, labelForDayKey),
  ]);

  return {
    '24h': hours24,
    '7d': days7,
    '30d': days30,
    timezone: 'America/New_York',
    timezoneLabel: 'US Eastern (ET)',
  };
}
