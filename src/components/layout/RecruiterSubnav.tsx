'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { recruiterNavItems } from '@/components/layout/navConfig';

/**
 * Sticky secondary navigation for recruiter app routes — mirrors top nav but easier to scan on dense pages.
 */
export function RecruiterSubnav() {
  const pathname = usePathname() ?? '';

  const isActive = (href: string) => {
    if (href === '/recruiter') return pathname === '/recruiter' || pathname === '/recruiter/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      aria-label="Recruiter sections"
      className="mb-6 rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-2 shadow-sm"
    >
      <div className="flex flex-wrap gap-2">
        {recruiterNavItems.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition sm:px-4 ${
                active
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'bg-[var(--surface-light-card)] text-[var(--surface-light-muted)] ring-1 ring-[var(--surface-light-border)] hover:bg-[var(--accent-muted)] hover:text-[var(--accent)]'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        <Link
          href="/recruiter/schedule"
          className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition sm:px-4 ${
            pathname.startsWith('/recruiter/schedule')
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'bg-[var(--surface-light-card)] text-[var(--surface-light-muted)] ring-1 ring-[var(--surface-light-border)] hover:bg-[var(--accent-muted)] hover:text-[var(--accent)]'
          }`}
          title="Choose an applicant to schedule, or pick from the list on the next screen"
        >
          Schedule applicant
        </Link>
      </div>
    </nav>
  );
}
