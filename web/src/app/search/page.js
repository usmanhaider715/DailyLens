import { Suspense } from 'react';
import { SearchView } from '@/components/pages/SearchView';
import { Spinner } from '@/components/common/Spinner';

export const metadata = {
  title: 'Search',
  description: 'Search news and articles on The Daily Lens.',
  robots: { index: true, follow: true },
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <SearchView />
    </Suspense>
  );
}
