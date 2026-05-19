import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Suspense } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Spinner } from '../common/Spinner.jsx';
import {
  LayoutDashboard,
  FileText,
  Megaphone,
  Image as ImageIcon,
  Cpu,
  LogOut,
  Home,
} from 'lucide-react';

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/homepage', label: 'Homepage', icon: Home },
  { to: '/admin/articles', label: 'Articles', icon: FileText },
  { to: '/admin/articles/new', label: 'Write article', icon: FileText },
  { to: '/admin/breaking', label: 'Breaking News', icon: Megaphone },
  { to: '/admin/ads', label: 'Ad Manager', icon: ImageIcon },
  { to: '/admin/ai', label: 'AI Settings', icon: Cpu },
];

export function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <aside className="hidden w-64 shrink-0 bg-primary-950 text-white md:block">
        <div className="px-6 py-6 font-display text-xl font-bold">The Daily Lens Admin</div>
        <nav className="space-y-1 px-3">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-white/10' : 'hover:bg-white/5'
                }`
              }
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="mt-8 flex w-full items-center gap-2 px-6 py-2 text-left text-sm text-white/80 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </aside>

      <main className="flex-1 overflow-auto bg-white dark:bg-gray-900">
        <div className="border-b border-gray-100 px-6 py-4 md:hidden dark:border-gray-800">
          <div className="font-display text-lg font-bold text-primary-950 dark:text-white">Admin</div>
        </div>
        <div className="p-6">
          <Suspense
            fallback={
              <div className="flex justify-center py-16">
                <Spinner />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
