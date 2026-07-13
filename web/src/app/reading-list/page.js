import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { ReadingListView } from '@/components/pages/ReadingListView';

export const metadata = {
  title: 'Your Reading List',
  description: 'Your saved articles and recently viewed stories on The Daily Lens.',
  alternates: { canonical: '/reading-list' },
  robots: { index: false, follow: true },
};

export default function ReadingListPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <ReadingListView />
      <Footer />
    </div>
  );
}
