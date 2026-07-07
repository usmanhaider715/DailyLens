const TZ = 'America/New_York';

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
