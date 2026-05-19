import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';

export const metadata = { title: 'Admin Dashboard', robots: { index: false, follow: false } };

export default function AdminDashboardPage() {
  return <AnalyticsDashboard />;
}
