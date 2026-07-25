'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { IntervionLogo } from '@/components/ui/IntervionLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BRAND_NAME } from '@/lib/brand';

type CandidateAuthLayoutProps = {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  wide?: boolean;
};

export function CandidateAuthLayout({ children, title, subtitle, wide }: CandidateAuthLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface-light)] text-[var(--surface-light-fg)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in srgb, var(--accent) 18%, transparent), transparent), radial-gradient(ellipse 50% 40% at 100% 80%, color-mix(in srgb, var(--surface-light-fg) 6%, transparent), transparent)',
        }}
      />

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={wide ? 'mx-auto w-full max-w-2xl' : 'w-full'}
        >
          <Link href="/" className="mb-8 flex flex-col items-start gap-3">
            <IntervionLogo className="h-10" />
            <span className="font-display text-2xl font-semibold tracking-tight text-[var(--surface-light-fg-heading)] sm:text-3xl">
              {BRAND_NAME}
            </span>
          </Link>

          <div className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6 shadow-[var(--dash-shadow-md)] sm:p-8">
            <h1 className="font-display text-xl font-semibold tracking-tight text-[var(--surface-light-fg-heading)] sm:text-2xl">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--surface-light-muted)]">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export const candidateAuthInputClass =
  'w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-sm text-[var(--surface-light-fg)] placeholder:text-[var(--surface-light-muted-soft)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]';

export const candidateAuthLabelClass = 'mb-1.5 block text-sm font-medium text-[var(--surface-light-fg)]';

export const candidateAuthPrimaryBtnClass =
  'inline-flex w-full items-center justify-center rounded-xl bg-[var(--surface-light-fg)] px-4 py-3 text-sm font-semibold text-[var(--surface-light-card)] transition hover:opacity-90 disabled:opacity-60';
