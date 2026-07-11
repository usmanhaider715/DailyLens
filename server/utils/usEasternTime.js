const TZ = 'America/New_York';

export const US_EASTERN_TZ = TZ;

/** Current date/time parts in US Eastern (handles EST/EDT). */
export function getEasternDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: Number(get('hour') === '24' ? '0' : get('hour')),
    minute: Number(get('minute')),
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

export function formatEasternTime(hourET, minuteET) {
  const h = Number(hourET);
  const m = Number(minuteET);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm} ET`;
}

export function periodMatchesNow(period, date = new Date()) {
  if (!period?.enabled) return false;
  const et = getEasternDateParts(date);
  return et.hour === Number(period.hourET) && et.minute === Number(period.minuteET);
}

/** Last N hour bucket keys in US Eastern (YYYY-MM-DD-HH). */
export function listEasternHourKeys(count = 24, end = new Date()) {
  const keys = [];
  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(end.getTime() - i * 60 * 60 * 1000);
    const p = getEasternDateParts(t);
    keys.push(`${p.dateKey}-${String(p.hour).padStart(2, '0')}`);
  }
  return keys;
}

/** Last N calendar day bucket keys in US Eastern (YYYY-MM-DD). */
export function listEasternDayKeys(count = 7, end = new Date()) {
  const keys = [];
  const seen = new Set();
  for (let i = count * 24; i >= 0; i--) {
    const t = new Date(end.getTime() - i * 60 * 60 * 1000);
    const p = getEasternDateParts(t);
    if (!seen.has(p.dateKey)) {
      keys.push(p.dateKey);
      seen.add(p.dateKey);
    }
    if (keys.length >= count) break;
  }
  return keys.slice(-count);
}

export function formatInEastern(date = new Date(), options = {}) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    ...options,
  }).format(new Date(date));
}
