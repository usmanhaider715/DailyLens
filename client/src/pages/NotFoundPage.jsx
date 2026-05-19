import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 dark:bg-gray-950">
      <h1 className="font-display text-5xl font-bold text-primary-900 dark:text-white">404</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-300">We could not find that page.</p>
      <Link to="/" className="mt-6 text-primary-700 hover:underline">
        Back home
      </Link>
    </div>
  );
}
