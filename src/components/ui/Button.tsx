import Link from 'next/link';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary';
type ButtonSize = 'md' | 'lg';

interface SharedProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
}

type ButtonProps =
  | (SharedProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: never })
  | (SharedProps & React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string });

const base =
  'inline-flex items-center justify-center rounded-full font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--landing-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--landing-bg)]';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'btn-primary bg-[var(--landing-accent-solid)] text-white hover:bg-[var(--landing-accent)]',
  secondary:
    'btn-secondary border border-[var(--landing-muted)] bg-transparent text-[var(--landing-text)] hover:border-[var(--landing-text)] hover:bg-white/5',
};

const sizeClasses: Record<ButtonSize, string> = {
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'lg',
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(base, variantClasses[variant], sizeClasses[size], className);

  if ('href' in props && props.href) {
    const { href, ...anchorProps } = props;
    return (
      <Link href={href} className={classes} {...anchorProps}>
        {children}
      </Link>
    );
  }

  const buttonProps = props as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
