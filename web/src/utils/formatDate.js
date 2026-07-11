import { formatDistanceToNow } from 'date-fns';

/** All public-facing dates/times use US Eastern (ET/EDT). */
export const US_TIMEZONE = 'America/New_York';

function formatUs(date, options) {
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: US_TIMEZONE, ...options }).format(new Date(date));
  } catch {
    return '';
  }
}

export function formatArticleDate(date) {
  return formatUs(date, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatArticleDateTime(date) {
  const formatted = formatUs(date, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return formatted ? `${formatted} ET` : '';
}

export function formatUsTime(date) {
  return formatUs(date, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
}

export function formatUsDateTime(date, extra = {}) {
  return formatUs(date, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
    ...extra,
  });
}

export function formatUsShortDateTime(date) {
  return formatUs(date, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatRelative(date) {
  if (!date) return '';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '';
  }
}
