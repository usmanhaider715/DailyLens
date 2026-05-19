'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { setAuthToken } from '@/services/api';
import { Spinner } from '@/components/common/Spinner';

export function RequireAuth({ children }) {
  const { token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    if (token === null) return;
    if (!token) {
      router.replace(`/admin/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [token, router, pathname]);

  if (token === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!token) return null;

  return children;
}
