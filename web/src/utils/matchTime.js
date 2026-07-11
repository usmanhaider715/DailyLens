import { formatUsDateTime } from './formatDate';

/** Format match / event times in US Eastern. */
export function formatMatchTimeLocal(isoDate) {
  if (!isoDate) return '';
  return formatUsDateTime(isoDate);
}
