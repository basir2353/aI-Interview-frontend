'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/candidate/dashboard', label: 'Overview' },
  { href: '/candidate/profile', label: 'Profile Details' },
  { href: '/candidate/applications', label: 'Applied Jobs' },
  { href: '/candidate/career', label: 'Career' },
];

export function CandidateSubnav() {
  const pathname = usePathname();
  return (
    <div className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-2 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                active
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'bg-[var(--accent-muted)] text-[var(--accent)] hover:opacity-90'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
