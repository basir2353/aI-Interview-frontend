'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { IntervionLogo } from '@/components/ui/IntervionLogo';
import { BRAND_NAME } from '@/lib/brand';

type CandidateAuthLayoutProps = {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  wide?: boolean;
};

export function CandidateAuthLayout({ children, title, subtitle, wide }: CandidateAuthLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4f6f8] text-[#0f172a]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(56, 90, 140, 0.12), transparent), radial-gradient(ellipse 50% 40% at 100% 80%, rgba(15, 23, 42, 0.06), transparent)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%230f172a\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={wide ? 'mx-auto w-full max-w-2xl' : 'w-full'}
        >
          <Link href="/" className="mb-8 flex flex-col items-start gap-3">
            <IntervionLogo className="h-10" />
            <span className="font-display text-2xl font-semibold tracking-tight text-[#0f172a] sm:text-3xl">
              {BRAND_NAME}
            </span>
          </Link>

          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-8">
            <h1 className="font-display text-xl font-semibold tracking-tight text-[#0f172a] sm:text-2xl">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#64748b]">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export const candidateAuthInputClass =
  'w-full rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition focus:border-[#5b5bd6] focus:ring-2 focus:ring-[#5b5bd6]/20';

export const candidateAuthLabelClass =
  'mb-1.5 block text-sm font-medium text-[#334155]';

export const candidateAuthPrimaryBtnClass =
  'inline-flex w-full items-center justify-center rounded-xl bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:opacity-60';
