'use client';

import { RequireAuth } from '@/components/admin/RequireAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminPanelLayout({ children }) {
  return (
    <RequireAuth>
      <AdminLayout>{children}</AdminLayout>
    </RequireAuth>
  );
}
