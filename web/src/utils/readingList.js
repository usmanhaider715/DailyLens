'use client';

/**
 * Local-only reader state (recently viewed + bookmarks) persisted in
 * localStorage. No account required; nothing leaves the browser.
 */

const RECENT_KEY = 'dl_recent_v1';
const BOOKMARK_KEY = 'dl_bookmarks_v1';
const RECENT_LIMIT = 24;
const BOOKMARK_LIMIT = 200;

const RECENT_EVENT = 'dl:recent-changed';
const BOOKMARK_EVENT = 'dl:bookmarks-changed';

function read(key) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(key, list, eventName) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(eventName));
  } catch {
    /* quota / disabled storage — ignore */
  }
}

function normalize(article) {
  if (!article?.slug) return null;
  return {
    slug: article.slug,
    title: article.title || '',
    category: article.category || '',
    image: article.image || article.featuredImage || article.heroImage?.url || '',
    savedAt: Date.now(),
  };
}

export function getRecentlyViewed() {
  return read(RECENT_KEY);
}

export function addRecentlyViewed(article) {
  const item = normalize(article);
  if (!item) return;
  const list = read(RECENT_KEY).filter((a) => a.slug !== item.slug);
  list.unshift(item);
  write(RECENT_KEY, list.slice(0, RECENT_LIMIT), RECENT_EVENT);
}

export function getBookmarks() {
  return read(BOOKMARK_KEY);
}

export function isBookmarked(slug) {
  return read(BOOKMARK_KEY).some((a) => a.slug === slug);
}

/** Toggle a bookmark; returns the new bookmarked state. */
export function toggleBookmark(article) {
  const item = normalize(article);
  if (!item) return false;
  const list = read(BOOKMARK_KEY);
  const exists = list.some((a) => a.slug === item.slug);
  const next = exists
    ? list.filter((a) => a.slug !== item.slug)
    : [item, ...list].slice(0, BOOKMARK_LIMIT);
  write(BOOKMARK_KEY, next, BOOKMARK_EVENT);
  return !exists;
}

export const READING_LIST_EVENTS = { RECENT_EVENT, BOOKMARK_EVENT };
