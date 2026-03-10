'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';
import { useTheme } from '@/context/ThemeContext';

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  theme?: 'dark' | 'light' | 'landing';
}

export function AppShell({
  children,
  title,
  subtitle,
  backHref = '/',
  backLabel = 'Home',
  actions,
  theme: themeProp = 'dark',
}: AppShellProps) {
  const { theme: globalTheme } = useTheme();
  const isLight = globalTheme === 'light';
  const isLanding = themeProp === 'landing';

  return (
    <div
      data-theme={isLanding ? 'landing' : undefined}
      className={cn(
        'min-h-screen',
        isLight && !isLanding && 'bg-[var(--surface-light)] text-[var(--surface-light-fg)]',
        !isLight && !isLanding && 'bg-gradient-dark',
        isLanding && 'landing-gradient text-[var(--landing-text)]'
      )}
    >
      <main className="container mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8 lg:px-8">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4 sm:mb-6">
          <div className="min-w-0">
            {backHref && (
              <Link
                href={backHref}
                className={cn(
                  'mb-1 inline-block text-sm font-medium transition-colors',
                  isLight && 'text-[var(--surface-light-muted)] hover:text-[var(--surface-light-fg)]',
                  !isLight && !isLanding && 'text-[var(--app-muted)] hover:text-[var(--foreground)]',
                  isLanding && 'text-[var(--landing-muted)] hover:text-[var(--landing-text)]'
                )}
              >
                ← {backLabel}
              </Link>
            )}
            <h1
              className={cn(
                'truncate text-xl font-semibold tracking-tight sm:text-2xl',
                isLight && 'text-[var(--surface-light-fg)]',
                !isLight && !isLanding && 'text-[var(--foreground)]',
                isLanding && 'text-[var(--landing-text)]'
              )}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className={cn(
                  'mt-0.5 truncate text-sm font-medium',
                  isLight && 'text-[var(--surface-light-muted)]',
                  !isLight && !isLanding && 'text-[var(--app-muted)]',
                  isLanding && 'text-[var(--landing-muted)]'
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}
