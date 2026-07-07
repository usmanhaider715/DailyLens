'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Megaphone,
  Image as ImageIcon,
  Cpu,
  LogOut,
  Home,
  TrendingUp,
  Menu,
  X,
  Share2,
} from 'lucide-react';

const links = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/homepage', label: 'Homepage', icon: Home },
  { href: '/admin/auto-share', label: 'Auto-share', icon: Share2 },
  { href: '/admin/articles', label: 'Articles', icon: FileText },
  { href: '/admin/articles/new', label: 'Write article', icon: FileText },
  { href: '/admin/breaking', label: 'Breaking News', icon: Megaphone },
  { href: '/admin/ads', label: 'Ad Manager', icon: ImageIcon },
  { href: '/admin/trends', label: 'Google News', icon: TrendingUp },
  { href: '/admin/ai', label: 'AI Settings', icon: Cpu },
];

function NavLinks({ pathname, onNavigate }) {
  return links.map((l) => {
    const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
    return (
      <Link
        key={l.href}
        href={l.href}
        onClick={onNavigate}
        className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
          active ? 'bg-white/10' : 'hover:bg-white/5'
        }`}
      >
        <l.icon className="h-4 w-4 shrink-0" />
        {l.label}
      </Link>
    );
  });
}

export function AdminLayout({ children }) {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <aside className="hidden w-64 shrink-0 bg-primary-950 text-white md:block">
        <div className="flex items-center gap-2 px-6 py-6">
          <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
          <span className="font-display text-xl font-bold">Admin</span>
        </div>
        <nav className="space-y-1 px-3">
          <NavLinks pathname={pathname} />
        </nav>
        <button
          type="button"
          onClick={() => {
            logout();
            router.push('/');
          }}
          className="mt-8 flex w-full items-center gap-2 px-6 py-2 text-left text-sm text-white/80 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu"
            onClick={closeMobile}
          />
          <aside className="relative flex h-full w-[min(100%,280px)] flex-col bg-primary-950 text-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
                <span className="font-display text-lg font-bold">Admin</span>
              </div>
              <button type="button" onClick={closeMobile} aria-label="Close">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3">
              <NavLinks pathname={pathname} onNavigate={closeMobile} />
            </nav>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push('/');
              }}
              className="flex items-center gap-2 border-t border-white/10 px-4 py-4 text-sm text-white/80"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1 overflow-auto bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 md:hidden dark:border-gray-800">
          <div className="font-display text-lg font-bold text-primary-950 dark:text-white">Admin</div>
          <button
            type="button"
            className="rounded-md p-2 text-gray-700 dark:text-gray-200"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
