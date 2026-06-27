import { cn } from '@/lib/cn';

type StatusVariant = 'default' | 'success' | 'warning' | 'error' | 'neutral';

const variantClasses: Record<StatusVariant, string> = {
  default: 'bg-[var(--accent-muted)] text-[var(--accent)] ring-1 ring-[var(--accent)]/20',
  success: 'bg-[var(--success-bg)] text-[var(--success-text)] ring-1 ring-[var(--success-border)]',
  warning: 'bg-[var(--warning-bg)] text-[var(--warning-text)] ring-1 ring-[var(--warning-border)]',
  error: 'bg-[var(--error-bg)] text-[var(--error-text)] ring-1 ring-[var(--error-border)]',
  neutral: 'bg-[var(--dash-badge-neutral-bg)] text-[var(--dash-badge-neutral-fg)] ring-1 ring-[var(--dash-badge-neutral-border)]',
};

interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: StatusVariant;
  className?: string;
}

export function StatusBadge({ children, variant = 'default', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function statusToVariant(status: string): StatusVariant {
  const s = status.toLowerCase().replace(/\s+/g, '_');
  if (s === 'completed' || s === 'approved' || s === 'accepted') return 'success';
  if (s === 'in_progress' || s === 'pending' || s === 'review') return 'warning';
  if (s === 'cancelled' || s === 'rejected' || s === 'failed') return 'error';
  if (s === 'scheduled') return 'default';
  return 'neutral';
}
