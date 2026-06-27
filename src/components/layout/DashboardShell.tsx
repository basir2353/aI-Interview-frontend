'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import type { NavItem } from '@/components/layout/navConfig';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/cn';
import type { LucideIcon } from 'lucide-react';

interface DashboardShellProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  brandLabel: string;
  brandHref: string;
  navItems: NavItem[];
  navIcons: Record<string, LucideIcon>;
  onLogout: () => void;
}

export function DashboardShell({
  children,
  title,
  description,
  actions,
  brandLabel,
  brandHref,
  navItems,
  navIcons,
  onLogout,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === brandHref) return pathname === brandHref || pathname === `${brandHref}/`;
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    closeSidebar();
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSidebar();
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [sidebarOpen]);

  return (
    <div data-dashboard-shell className="flex min-h-screen bg-[var(--surface-light)] text-[var(--surface-light-fg)]">
      <div
        aria-hidden
        className={cn(
          'fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-sm transition-opacity lg:hidden',
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={closeSidebar}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[var(--surface-light-border)] bg-[var(--dash-sidebar)] transition-transform duration-200 ease-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-[var(--surface-light-border)] px-4">
          <Link href={brandHref} className="flex items-center gap-2.5 font-display font-semibold text-[var(--surface-light-fg)]" onClick={closeSidebar}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white">
              {brandLabel.charAt(0)}
            </span>
            <span className="truncate">{brandLabel}</span>
          </Link>
          <button
            type="button"
            onClick={closeSidebar}
            className="rounded-md p-1.5 text-[var(--surface-light-muted)] hover:bg-[var(--accent-muted)] lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = navIcons[item.href];
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSidebar}
                  className={cn(
                    'dash-sidebar-link',
                    active ? 'dash-sidebar-link-active' : 'dash-sidebar-link-inactive'
                  )}
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.25 : 2} />}
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-[var(--surface-light-border)] p-3">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <span className="text-xs font-medium text-[var(--surface-light-muted-soft)]">Theme</span>
            <ThemeToggle />
          </div>
          <Link
            href="/"
            onClick={closeSidebar}
            className="dash-sidebar-link dash-sidebar-link-inactive mb-1"
          >
            ← Home
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="dash-sidebar-link w-full text-left text-[var(--error-text)] hover:bg-[var(--error-bg)]"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:pl-64">
        <div className="border-b border-[var(--surface-light-border)] bg-[var(--dash-sidebar)] px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--surface-light-border)] text-[var(--surface-light-fg)]"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <ThemeToggle />
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--surface-light-fg-heading)] sm:text-3xl">
                {title}
              </h1>
              {description && (
                <p className="mt-1 text-sm text-[var(--surface-light-muted)]">{description}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <ThemeToggle className="hidden lg:flex" />
              {actions}
            </div>
          </div>
          <div className="min-w-0">{children}</div>
        </div>
      </main>
    </div>
  );
}
