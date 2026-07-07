import { format, formatDistanceToNow } from 'date-fns';

export function formatArticleDate(date) {
  if (!date) return '';
  try {
    return format(new Date(date), 'MMM d, yyyy');
  } catch {
    return '';
  }
}

export function formatArticleDateTime(date) {
  if (!date) return '';
  try {
    return format(new Date(date), 'MMM d, yyyy · h:mm a');
  } catch {
    return '';
  }
}

export function formatRelative(date) {
  if (!date) return '';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '';
  }
}
