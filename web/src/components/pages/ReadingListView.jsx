'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark } from 'lucide-react';
import { HeroImageFrame } from '@/components/common/HeroImageFrame';
import {
  getBookmarks,
  getRecentlyViewed,
  toggleBookmark,
  READING_LIST_EVENTS,
} from '@/utils/readingList';

function Card({ item, onRemove }) {
  return (
    <div className="group relative">
      <Link href={`/article/${item.slug}`} className="block">
        <HeroImageFrame
          url={item.image}
          alt={item.title}
          category={item.category}
          aspect="16/9"
          rounded="lg"
        />
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-400">
          {item.category}
        </p>
        <h3 className="mt-1 line-clamp-2 font-medium text-gray-900 group-hover:text-primary-700 dark:text-gray-100">
          {item.title}
        </h3>
      </Link>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(item)}
          className="mt-2 text-xs font-medium text-gray-500 hover:text-red-600 dark:text-gray-400"
        >
          Remove
        </button>
      )}
    </div>
  );
}

export function ReadingListView() {
  const [bookmarks, setBookmarks] = useState([]);
  const [recent, setRecent] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setBookmarks(getBookmarks());
      setRecent(getRecentlyViewed());
    };
    refresh();
    setReady(true);
    window.addEventListener(READING_LIST_EVENTS.BOOKMARK_EVENT, refresh);
    window.addEventListener(READING_LIST_EVENTS.RECENT_EVENT, refresh);
    return () => {
      window.removeEventListener(READING_LIST_EVENTS.BOOKMARK_EVENT, refresh);
      window.removeEventListener(READING_LIST_EVENTS.RECENT_EVENT, refresh);
    };
  }, []);

  const removeBookmark = (item) => {
    toggleBookmark(item);
    setBookmarks(getBookmarks());
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl font-bold text-gray-900 dark:text-white">Your reading list</h1>
        <p className="mt-3 text-gray-600 dark:text-gray-300">
          Bookmarks and recently viewed stories are saved on this device only.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-gray-900 dark:text-white">
          <Bookmark className="h-5 w-5" aria-hidden="true" /> Saved
        </h2>
        {ready && bookmarks.length === 0 ? (
          <p className="mt-4 text-gray-500">
            No saved articles yet. Tap <span className="font-medium">Save</span> on any article to add it here.
          </p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {bookmarks.map((a) => (
              <Card key={a.slug} item={a} onRemove={removeBookmark} />
            ))}
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Recently viewed</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((a) => (
              <Card key={a.slug} item={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
