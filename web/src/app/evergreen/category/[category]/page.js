import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { EvergreenIndexClient } from '@/components/evergreen/EvergreenIndexClient';

export async function generateMetadata({ params }) {
  const { category } = await params;
  const decoded = decodeURIComponent(category);
  return {
    title: `${decoded} Guides | Evergreen | The Daily Lens`,
    description: `Practical ${decoded.toLowerCase()} how-to guides and self-help articles from The Daily Lens.`,
    alternates: { canonical: `/evergreen/category/${category}` },
  };
}

export default async function EvergreenCategoryPage({ params }) {
  const { category } = await params;
  const decoded = decodeURIComponent(category);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <div className="border-b border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-900/40">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-700 dark:text-primary-400">
            Evergreen · {decoded}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gray-900 dark:text-white">{decoded} guides</h1>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EvergreenIndexClient initialCategory={decoded} />
      </div>
      <Footer />
    </div>
  );
}
