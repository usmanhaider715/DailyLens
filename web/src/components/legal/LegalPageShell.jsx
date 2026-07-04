import Link from 'next/link';
import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { FooterLegal } from '@/components/legal/SiteDisclaimers';

export function LegalPageShell({ title, description, children }) {
  return (
    <div className="min-h-screen bg-gray-50/80 dark:bg-gray-950">
      <Navbar />
      <div className="border-b border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-700 dark:text-primary-400">
            Legal
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-lg text-gray-600 dark:text-gray-300">{description}</p>
          ) : null}
        </div>
      </div>
      <article className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-10 dark:border-gray-800 dark:bg-gray-900">
          <div className="prose prose-gray max-w-none dark:prose-invert prose-headings:font-display prose-a:text-primary-700">
            {children}
          </div>
          <Link
            href="/"
            className="mt-10 inline-flex items-center text-sm font-semibold text-primary-700 hover:underline dark:text-primary-400"
          >
            ← Back to home
          </Link>
        </div>
        <FooterLegal />
      </article>
      <Footer />
    </div>
  );
}
