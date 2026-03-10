'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { adminNavItems } from '@/components/layout/navConfig';
import { api } from '@/lib/api';
import type { NavItem } from '@/components/layout/navConfig';

const LIMITED_ADMIN_HIDDEN_HREFS = ['/admin/admins', '/admin/access', '/admin/recruiters'];

interface AdminShellProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function AdminShell({ children, title, description, actions }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navItems, setNavItems] = useState<NavItem[]>(adminNavItems);

  useEffect(() => {
    api.adminMe().then((me) => {
      if (me.permissionLevel === 'limited') {
        setNavItems(adminNavItems.filter((item) => !LIMITED_ADMIN_HIDDEN_HREFS.includes(item.href)));
      } else {
        setNavItems(adminNavItems);
      }
    }).catch(() => setNavItems(adminNavItems));
  }, []);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin' || pathname === '/admin/';
    return pathname === href || pathname?.startsWith(href + '/');
  };

  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    closeSidebar();
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSidebar(); };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [sidebarOpen]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminEmail');
      router.push('/admin/login');
      router.refresh();
    }
  };

  const navLinkClass = (href: string) =>
    `rounded-xl px-4 py-3 text-sm font-medium transition-colors block ${
      isActive(href)
        ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
        : 'text-[var(--surface-light-muted)] hover:bg-[var(--surface-light)] hover:text-[var(--surface-light-fg)]'
    }`;

  return (
    <div className="flex min-h-screen max-w-full overflow-x-hidden bg-[var(--surface-light)] text-[var(--surface-light-fg)]">
      {/* Overlay when sidebar open on mobile */}
      <div
        aria-hidden
        className={`fixed inset-0 z-20 bg-black/50 transition-opacity lg:hidden ${sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={closeSidebar}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 max-w-[85vw] border-r border-[var(--surface-light-border)] bg-[var(--surface-light-card)] shadow-xl transition-transform duration-200 ease-out lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
      >
        <div className="flex h-14 min-h-[3.5rem] items-center justify-between border-b border-[var(--surface-light-border)] px-4">
          <Link href="/admin" className="font-semibold text-[var(--surface-light-fg)]" onClick={closeSidebar}>
            Admin
          </Link>
          <button
            type="button"
            onClick={closeSidebar}
            className="rounded-lg p-2 text-[var(--surface-light-muted)] hover:bg-[var(--surface-light)] hover:text-[var(--surface-light-fg)] lg:hidden"
            aria-label="Close menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex flex-col gap-0.5 overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={navLinkClass(item.href)} onClick={closeSidebar}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-3">
          <Link href="/" className="mb-2 block rounded-xl px-4 py-3 text-sm font-medium text-[var(--surface-light-muted)] hover:bg-[var(--surface-light)] hover:text-[var(--surface-light-fg)]" onClick={closeSidebar}>
            ← Home
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-[var(--error-text)] hover:bg-[var(--error-bg)]"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:pl-64">
        <div className="container mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:py-8 lg:px-8">
          <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between lg:mb-8">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] text-[var(--surface-light-fg)] hover:bg-[var(--accent-muted)] lg:hidden"
                aria-label="Open menu"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="break-words text-lg font-bold tracking-tight text-[var(--surface-light-fg)] sm:text-xl md:text-2xl lg:text-3xl">{title}</h1>
                {description && (
                  <p className="mt-0.5 break-words text-sm font-medium text-[var(--surface-light-muted)]">{description}</p>
                )}
              </div>
            </div>
            {actions && <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">{actions}</div>}
          </div>
          <div className="min-w-0">{children}</div>
        </div>
      </main>
    </div>
  );
}
