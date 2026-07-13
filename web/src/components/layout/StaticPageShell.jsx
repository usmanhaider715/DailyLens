import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';

/** Shared layout for policy / info pages (Navbar + centered article + Footer). */
export function StaticPageShell({ title, intro, updated, children }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <article className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {intro && (
          <p className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-gray-300">{intro}</p>
        )}
        {updated && (
          <p className="mt-2 text-xs text-gray-400">Last updated {updated}</p>
        )}
        <div className="mt-6">{children}</div>
      </article>
      <Footer />
    </div>
  );
}

/** Consistent section heading with an anchor id for deep links. */
export function PolicySection({ id, title, children }) {
  return (
    <section className="mt-10">
      <h2
        id={id}
        className="scroll-mt-24 font-display text-xl font-bold text-gray-900 dark:text-white"
      >
        {title}
      </h2>
      <div className="mt-3 space-y-3 leading-relaxed text-gray-600 dark:text-gray-300">
        {children}
      </div>
    </section>
  );
}
