import { cn } from '@/lib/cn';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children }: CardProps) {
  return (
    <div
      className={cn(
        'card-default rounded-xl border border-[var(--landing-border)] bg-[var(--landing-surface)] p-6 backdrop-blur-sm transition-shadow hover:shadow-lg hover:shadow-[var(--landing-accent-solid)]/5',
        className
      )}
    >
      {children}
    </div>
  );
}
