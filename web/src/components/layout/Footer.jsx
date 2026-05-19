import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-100 bg-gray-50 py-12 dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 md:flex-row md:justify-between">
        <div>
          <div className="font-display text-2xl font-bold text-primary-950 dark:text-white">The Daily Lens</div>
          <p className="mt-2 max-w-md text-sm text-gray-600 dark:text-gray-300">
            AI-assisted journalism with human editorial standards. Updated every fifteen minutes from trusted
            sources worldwide.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">Sections</div>
            <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-300">
              <li>
                <Link href="/category/World" className="hover:text-primary-700">
                  World
                </Link>
              </li>
              <li>
                <Link href="/category/Technology" className="hover:text-primary-700">
                  Technology
                </Link>
              </li>
              <li>
                <Link href="/category/Business" className="hover:text-primary-700">
                  Business
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">Company</div>
            <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-300">
              <li>
                <a href="/feed.xml" className="hover:text-primary-700">
                  RSS Feed
                </a>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-primary-700">
                  Admin
                </Link>
              </li>
              <li>
                <a href="/sitemap.xml" className="hover:text-primary-700">
                  Sitemap
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl px-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} The Daily Lens. All rights reserved.
      </div>
    </footer>
  );
}
