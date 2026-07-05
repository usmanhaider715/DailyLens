import { detectTimezone } from './visitorLocation';

export function formatMatchTimeLocal(isoDate, timezone) {
  if (!isoDate) return '';
  try {
    return new Date(isoDate).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone || detectTimezone(),
      timeZoneName: 'short',
    });
  } catch {
    return new Date(isoDate).toLocaleString();
  }
}
