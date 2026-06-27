import { cn } from '@/lib/cn';

type IntervionLogoProps = {
  className?: string;
  /** Force a logo for a specific background instead of following `data-theme`. */
  variant?: 'auto' | 'on-light' | 'on-dark';
};

export function IntervionLogo({ className, variant = 'auto' }: IntervionLogoProps) {
  const imgClass = cn('h-8 w-auto max-w-[140px] object-contain object-left', className);

  if (variant === 'on-light') {
    return <img src="/dark_logo.png" alt="Intervion" className={imgClass} />;
  }

  if (variant === 'on-dark') {
    return <img src="/white_logo.png" alt="Intervion" className={imgClass} />;
  }

  return (
    <span className="inline-flex shrink-0 items-center">
      <img
        src="/white_logo.png"
        alt="Intervion"
        className={cn('intervion-logo-on-dark', imgClass)}
      />
      <img
        src="/dark_logo.png"
        alt=""
        aria-hidden
        className={cn('intervion-logo-on-light', imgClass)}
      />
    </span>
  );
}
