import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { EvergreenIndexClient } from '@/components/evergreen/EvergreenIndexClient';

export const metadata = {
  title: 'Evergreen Guides | The Daily Lens',
  description:
    'Practical self-help and how-to guides on finance, insurance, legal topics, technology, health, business, and entertainment.',
  alternates: { canonical: '/evergreen' },
};

export default function EvergreenIndexPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <div className="border-b border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-900/40">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <h1 className="font-display text-4xl font-bold text-gray-900 dark:text-white">Evergreen guides</h1>
          <p className="mt-3 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            In-depth how-to articles designed to help you solve real problems — updated for long-term search value.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EvergreenIndexClient />
      </div>
      <Footer />
    </div>
  );
}
