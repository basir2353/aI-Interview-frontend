'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { IntervionLogo } from '@/components/ui/IntervionLogo';
import { BRAND_NAME } from '@/lib/brand';

const NAV = [
  { href: '/candidate/dashboard', label: 'Overview' },
  { href: '/candidate/applications', label: 'Applications' },
  { href: '/candidate/career', label: 'Career' },
  { href: '/candidate/profile', label: 'Profile' },
] as const;

type CandidateShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
};

export function CandidateShell({ children, title, subtitle }: CandidateShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setName(localStorage.getItem('candidateName') || '');
  }, [pathname]);

  const logout = () => {
    localStorage.removeItem('candidateToken');
    localStorage.removeItem('candidateName');
    localStorage.removeItem('candidateEmail');
    router.replace('/candidate/login');
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#0f172a]">
      <header className="sticky top-0 z-40 border-b border-[#e2e8f0] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/candidate/dashboard" className="flex shrink-0 items-center gap-2.5">
            <IntervionLogo className="h-8" />
            <span className="hidden font-display text-sm font-semibold tracking-tight text-[#0f172a] sm:inline">
              {BRAND_NAME}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Candidate">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active ? 'text-[#0f172a]' : 'text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  {item.label}
                  {active && (
                    <motion.span
                      layoutId="candidate-nav-underline"
                      className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-[#5b5bd6]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/jobs"
              className="hidden rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-sm font-semibold text-[#0f172a] transition hover:border-[#cbd5e1] sm:inline-flex"
            >
              Browse jobs
            </Link>
            <button
              type="button"
              onClick={logout}
              className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-[#64748b] transition hover:text-[#0f172a] sm:inline-flex"
            >
              {name ? `Sign out` : 'Sign out'}
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2e8f0] md:hidden"
              aria-label="Menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-[#e2e8f0] bg-white px-4 py-3 md:hidden"
          >
            <div className="flex flex-col gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                    pathname === item.href ? 'bg-[#f1f5f9] text-[#0f172a]' : 'text-[#64748b]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/jobs"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#0f172a]"
              >
                Browse jobs
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#64748b]"
              >
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-8">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-[#0f172a] sm:text-3xl">
              {title}
            </h1>
            {subtitle && <p className="mt-2 max-w-2xl text-sm text-[#64748b] sm:text-base">{subtitle}</p>}
          </div>
          {children}
        </motion.div>
      </main>
    </div>
  );
}
