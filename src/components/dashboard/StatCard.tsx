import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  iconColor?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  iconColor = 'text-[var(--accent)] bg-[var(--accent-muted)]',
  href,
  onClick,
  className,
}: StatCardProps) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[var(--surface-light-muted)]">{label}</p>
        {Icon && (
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconColor)}>
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-[var(--surface-light-fg)]">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-[var(--surface-light-muted-soft)]">{hint}</p>}
    </>
  );

  const cardClass = cn(
    'dash-card block p-5 text-left transition hover:border-[var(--accent)]/30 hover:shadow-md',
    (href || onClick) && 'cursor-pointer',
    className
  );

  if (href) {
    return (
      <Link href={href} className={cardClass}>
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(cardClass, 'w-full')}>
        {inner}
      </button>
    );
  }

  return <div className={cardClass}>{inner}</div>;
}
