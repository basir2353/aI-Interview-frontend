import Link from 'next/link';
import { cn } from '@/lib/cn';

interface DashboardCardProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function DashboardCard({
  title,
  description,
  action,
  actionHref,
  actionLabel,
  children,
  className,
  noPadding,
}: DashboardCardProps) {
  const hasHeader = title || description || action || actionHref;

  return (
    <div className={cn('dash-card overflow-hidden', className)}>
      {hasHeader && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--surface-light-border)] px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-semibold text-[var(--surface-light-fg)]">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-[var(--surface-light-muted)]">{description}</p>
            )}
          </div>
          {action}
          {actionHref && actionLabel && (
            <Link
              href={actionHref}
              className="shrink-0 text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]"
            >
              {actionLabel} →
            </Link>
          )}
        </div>
      )}
      <div className={cn(!noPadding && 'p-5')}>{children}</div>
    </div>
  );
}
