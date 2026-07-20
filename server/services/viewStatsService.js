import { ViewBucket } from '../models/ViewBucket.js';
import {
  getEasternDateParts,
  listEasternDayKeys,
  listEasternHourKeys,
  formatInEastern,
  US_EASTERN_TZ,
} from '../utils/usEasternTime.js';

const SEGMENTS = {
  all: '',
  news: ':news',
  evergreen: ':evergreen',
};

function keyWithSegment(baseKey, segment) {
  return `${baseKey}${SEGMENTS[segment] || ''}`;
}

function easternInstantFromDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  for (const hourUtc of [17, 16, 18, 19, 20, 21, 22, 23, 15, 14]) {
    const dt = new Date(Date.UTC(year, month - 1, day, hourUtc, 0, 0));
    if (getEasternDateParts(dt).dateKey === dateKey) return dt;
  }
  return new Date(Date.UTC(year, month - 1, day, 17, 0, 0));
}

function labelForHourKey(key) {
  const base = key.split(':')[0];
  const hourPart = base.split('-').pop();
  const date = base.slice(0, base.lastIndexOf('-'));
  const h = Number(hourPart);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${date.slice(5)} ${h12}${ampm}`;
}

function labelForDayKey(key) {
  const base = key.split(':')[0];
  const [, month, day] = base.split('-');
  return `${Number(month)}/${Number(day)}`;
}

function labelForWeekday(key) {
  const base = key.split(':')[0];
  return formatInEastern(easternInstantFromDateKey(base), { weekday: 'short' });
}

async function bumpBucket(granularity, bucketKey) {
  return ViewBucket.updateOne({ granularity, bucketKey }, { $inc: { views: 1 } }, { upsert: true });
}

/** Record one article page view in US Eastern hour + day buckets (all + news/evergreen). */
export async function recordArticleView({ isEvergreen = false } = {}) {
  const now = new Date();
  const parts = getEasternDateParts(now);
  const hourBase = `${parts.dateKey}-${String(parts.hour).padStart(2, '0')}`;
  const dayBase = parts.dateKey;
  const segment = isEvergreen ? 'evergreen' : 'news';

  await Promise.all([
    bumpBucket('hour', keyWithSegment(hourBase, 'all')),
    bumpBucket('day', keyWithSegment(dayBase, 'all')),
    bumpBucket('hour', keyWithSegment(hourBase, segment)),
    bumpBucket('day', keyWithSegment(dayBase, segment)),
  ]);
}

async function seriesForKeys(granularity, keys, labelFn, segment = 'all') {
  const bucketKeys = keys.map((k) => keyWithSegment(k, segment));
  const docs = await ViewBucket.find({ granularity, bucketKey: { $in: bucketKeys } }).lean();
  const map = new Map(docs.map((d) => [d.bucketKey, d.views || 0]));
  return keys.map((key) => ({
    key,
    label: labelFn(key),
    views: map.get(keyWithSegment(key, segment)) || 0,
  }));
}

function mergeWeekSeries(keys, allSeries, newsSeries, evergreenSeries) {
  return keys.map((key, i) => ({
    key,
    label: labelForWeekday(key),
    dateLabel: labelForDayKey(key),
    views: allSeries[i]?.views || 0,
    newsViews: newsSeries[i]?.views || 0,
    evergreenViews: evergreenSeries[i]?.views || 0,
  }));
}

export async function getViewsChartSeries() {
  const hourKeys = listEasternHourKeys(24);
  const weekKeys = listEasternDayKeys(7);
  const monthKeys = listEasternDayKeys(30);

  const [hours24, days7All, days7News, days7Evergreen, days30All, days30News, days30Evergreen] =
    await Promise.all([
      seriesForKeys('hour', hourKeys, labelForHourKey, 'all'),
      seriesForKeys('day', weekKeys, labelForDayKey, 'all'),
      seriesForKeys('day', weekKeys, labelForDayKey, 'news'),
      seriesForKeys('day', weekKeys, labelForDayKey, 'evergreen'),
      seriesForKeys('day', monthKeys, labelForDayKey, 'all'),
      seriesForKeys('day', monthKeys, labelForDayKey, 'news'),
      seriesForKeys('day', monthKeys, labelForDayKey, 'evergreen'),
    ]);

  const days7 = mergeWeekSeries(weekKeys, days7All, days7News, days7Evergreen);
  const days30 = monthKeys.map((key, i) => ({
    key,
    label: labelForDayKey(key),
    views: days30All[i]?.views || 0,
    newsViews: days30News[i]?.views || 0,
    evergreenViews: days30Evergreen[i]?.views || 0,
  }));

  const weekNewsTotal = days7.reduce((s, p) => s + p.newsViews, 0);
  const weekEvergreenTotal = days7.reduce((s, p) => s + p.evergreenViews, 0);
  const weekTotal = days7.reduce((s, p) => s + p.views, 0);

  return {
    '24h': hours24,
    '7d': days7,
    '30d': days30,
    weekTotals: {
      all: weekTotal,
      news: weekNewsTotal,
      evergreen: weekEvergreenTotal,
    },
    timezone: US_EASTERN_TZ,
    timezoneLabel: 'US Eastern (ET)',
  };
}
