import { cn } from '@/lib/cn';

interface SectionProps {
  id?: string;
  className?: string;
  containerClassName?: string;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function Section({
  id,
  className,
  containerClassName,
  title,
  subtitle,
  children,
}: SectionProps) {
  return (
    <section id={id} className={cn('py-16 sm:py-24', className)}>
      <div className={cn('mx-auto max-w-6xl px-4 sm:px-6 lg:px-8', containerClassName)}>
        {(title || subtitle) && (
          <div className="mx-auto max-w-2xl text-center">
            {title && (
              <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--landing-text)] sm:text-3xl">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-3 text-base text-[var(--landing-muted)] sm:text-lg">
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
