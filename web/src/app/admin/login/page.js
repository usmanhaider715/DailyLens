import { Suspense } from 'react';
import { AdminLoginPage } from '@/components/pages/AdminLoginPage';
import { Spinner } from '@/components/common/Spinner';

export const metadata = { title: 'Admin Login', robots: { index: false, follow: false } };

export default function AdminLoginRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <AdminLoginPage />
    </Suspense>
  );
}
