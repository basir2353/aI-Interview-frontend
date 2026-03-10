'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { getNavForPathname } from '@/components/layout/navConfig';
import { useTheme } from '@/context/ThemeContext';

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

export function SiteHeader() {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [recruiterLoggedIn, setRecruiterLoggedIn] = useState(false);
  const [candidateLoggedIn, setCandidateLoggedIn] = useState(false);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [recruiterName, setRecruiterName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  const { items: navLinks, area } = getNavForPathname(pathname ?? '');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rToken = localStorage.getItem('recruiterToken');
    const cToken = localStorage.getItem('candidateToken');
    const aToken = localStorage.getItem('adminToken');
    setRecruiterLoggedIn(Boolean(rToken));
    setCandidateLoggedIn(Boolean(cToken));
    setAdminLoggedIn(Boolean(aToken));
    setCandidateName(localStorage.getItem('candidateName') || '');
    setRecruiterName(localStorage.getItem('recruiterName') || '');
    setAdminEmail(localStorage.getItem('adminEmail') || '');
  }, [pathname]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [userMenuOpen]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/admin') return pathname === '/admin' || pathname === '/admin/';
    if (href.startsWith('/#')) return false;
    return pathname === href || (href !== '/recruiter' && href !== '/candidate/dashboard' && pathname?.startsWith(href));
  };

  const linkClass = (href: string) =>
    `shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      isActive(href)
        ? 'text-[var(--landing-text)] bg-white/10'
        : 'text-[var(--landing-muted)] hover:text-[var(--landing-text)] hover:bg-white/5'
    }`;

  const handleLogout = (role: 'recruiter' | 'candidate' | 'admin') => {
    if (typeof window === 'undefined') return;
    if (role === 'recruiter') {
      localStorage.removeItem('recruiterToken');
      localStorage.removeItem('recruiterEmail');
      localStorage.removeItem('recruiterName');
      router.push('/recruiter/login');
    } else if (role === 'candidate') {
      localStorage.removeItem('candidateToken');
      localStorage.removeItem('candidateName');
      localStorage.removeItem('candidateEmail');
      router.push('/candidate/login');
    } else {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminEmail');
      router.push('/admin/login');
    }
    setMobileOpen(false);
    router.refresh();
  };

  const renderUserMenu = (role: 'admin' | 'recruiter' | 'candidate', displayName: string) => (
    <div className="relative" ref={userMenuRef}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setUserMenuOpen((o) => !o); }}
        className="flex items-center gap-2 rounded-lg border border-[var(--landing-border)] bg-white/5 px-3 py-2 text-sm font-medium text-[var(--landing-text)] hover:bg-white/10"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--landing-muted)] bg-white/5">
          <UserIcon className="h-4 w-4 text-[var(--landing-muted)]" />
        </span>
        <span className="max-w-[120px] truncate">{displayName}</span>
        <ChevronDownIcon className={`h-4 w-4 text-[var(--landing-muted)] transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
      </button>
      {userMenuOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-[var(--landing-border)] bg-[var(--landing-surface-solid)] py-1 shadow-lg">
          {role === 'admin' && (
            <Link href="/" className="block px-4 py-2.5 text-left text-sm font-medium text-[var(--landing-text)] hover:bg-white/10" onClick={() => setUserMenuOpen(false)}>
              Home
            </Link>
          )}
          {role === 'recruiter' && (
            <Link href="/recruiter" className="block px-4 py-2.5 text-left text-sm font-medium text-[var(--landing-text)] hover:bg-white/10" onClick={() => setUserMenuOpen(false)}>
              Dashboard
            </Link>
          )}
          {role === 'candidate' && (
            <Link href="/candidate/dashboard" className="block px-4 py-2.5 text-left text-sm font-medium text-[var(--landing-text)] hover:bg-white/10" onClick={() => setUserMenuOpen(false)}>
              Dashboard
            </Link>
          )}
          <button
            type="button"
            onClick={() => { setUserMenuOpen(false); handleLogout(role); }}
            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-[var(--landing-muted)] hover:bg-white/10"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );

  const renderRight = () => {
    if (area === 'admin') {
      if (adminLoggedIn) {
        return (
          <div className="flex items-center gap-2">
            <Link href="/" className="rounded-md px-3 py-2 text-sm font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)] hover:bg-white/5">
              Home
            </Link>
            {renderUserMenu('admin', adminEmail || 'Admin')}
          </div>
        );
      }
      return null;
    }
    if (area === 'recruiter') {
      if (recruiterLoggedIn) {
        return (
          <div className="flex items-center gap-2">
            <Link href="/recruiter" className="rounded-full bg-[var(--landing-accent-solid)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--landing-accent)]">
              New interview
            </Link>
            {renderUserMenu('recruiter', recruiterName || 'Recruiter')}
          </div>
        );
      }
      return (
        <>
          <Link href="/candidate/login" className="flex min-w-[6.25rem] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-[var(--landing-muted)] bg-transparent px-4 py-2 text-center text-sm font-medium text-[var(--landing-text)] transition-colors hover:border-[var(--landing-text)] hover:bg-white/5">
            Sign In
          </Link>
          <Link href="/candidate/signup" className="flex min-w-[6.25rem] shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-[var(--landing-accent-solid)] px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-[var(--landing-accent)]">
            Sign up
          </Link>
        </>
      );
    }
    if (area === 'candidate') {
      if (candidateLoggedIn) {
        return renderUserMenu('candidate', candidateName || 'Account');
      }
      return (
        <>
                    <Link href="/candidate/login" className="flex min-w-[6.25rem] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-[var(--landing-border)] bg-transparent px-4 py-2 text-center text-sm font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)] hover:bg-white/5">
            Sign In
          </Link>
          <Link href="/candidate/signup" className="flex min-w-[6.25rem] shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-[var(--landing-accent-solid)] px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-[var(--landing-accent)]">
            Sign up
          </Link>
        </>
      );
    }
    // public
    if (recruiterLoggedIn) {
      return (
        <div className="flex items-center gap-2">
          <Link href="/recruiter" className="rounded-md px-3 py-2 text-sm font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)] hover:bg-white/5">
            Dashboard
          </Link>
          {renderUserMenu('recruiter', recruiterName || 'Recruiter')}
        </div>
      );
    }
    if (candidateLoggedIn) {
      return renderUserMenu('candidate', candidateName || 'Account');
    }
    return (
      <>
        <Link href="/recruiter/login" className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)] hover:bg-white/5">
          Recruiter
        </Link>
        <Link href="/candidate/login" className="flex min-w-[6.25rem] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-[var(--landing-muted)] bg-transparent px-4 py-2 text-center text-sm font-medium text-[var(--landing-text)] transition-colors hover:border-[var(--landing-text)] hover:bg-white/5">
          Sign In
        </Link>
        <Link href="/candidate/signup" className="flex min-w-[6.25rem] shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-[var(--landing-accent-solid)] px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-[var(--landing-accent)]">
          Sign up
        </Link>
      </>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--landing-border)] bg-[var(--landing-surface-solid)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3 lg:px-8">
        <Link
          href={area === 'admin' ? '/admin' : '/'}
          className="flex min-w-0 shrink-0 items-center gap-2 text-[var(--landing-text)] transition-opacity hover:opacity-90 sm:gap-2.5"
        >
          <span className="hidden shrink-0 sm:flex h-8 w-8 items-center justify-center rounded-full border border-[var(--landing-muted)] bg-transparent" />
          <span className="truncate font-display text-base font-semibold tracking-tight sm:text-lg">
            {area === 'admin' ? 'Admin' : 'Intervion'}
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--landing-border)] text-[var(--landing-muted)] transition-colors hover:bg-white/10 hover:text-[var(--landing-text)]"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>
          {renderRight()}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--landing-border)] text-[var(--landing-muted)] hover:bg-white/5 md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-[var(--landing-border)] bg-[var(--landing-surface-solid)] px-4 py-4 md:hidden">
          <div className="mb-3 flex items-center justify-between border-b border-[var(--landing-border)] pb-3">
            <span className="text-sm font-medium text-[var(--landing-muted)]">Theme</span>
            <button
              type="button"
              onClick={() => { toggleTheme(); }}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--landing-border)] text-[var(--landing-muted)] hover:bg-white/10"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className={`rounded-md px-3 py-2.5 text-sm font-medium ${linkClass(link.href)}`}>
                {link.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-1 border-t border-[var(--landing-border)] pt-3">
              {area === 'admin' && adminLoggedIn && (
                <>
                  <div className="flex items-center gap-2 px-3 py-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--landing-muted)] bg-white/5">
                      <UserIcon className="h-4 w-4 text-[var(--landing-muted)]" />
                    </span>
                    <span className="text-sm font-medium text-[var(--landing-text)]">{adminEmail || 'Admin'}</span>
                  </div>
                  <Link href="/" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">Home</Link>
                  <button type="button" onClick={() => handleLogout('admin')} className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">Logout</button>
                </>
              )}
              {area === 'recruiter' && recruiterLoggedIn && (
                <>
                  <div className="flex items-center gap-2 px-3 py-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--landing-muted)] bg-white/5">
                      <UserIcon className="h-4 w-4 text-[var(--landing-muted)]" />
                    </span>
                    <span className="text-sm font-medium text-[var(--landing-text)]">{recruiterName || 'Recruiter'}</span>
                  </div>
                  <Link href="/recruiter" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">New interview</Link>
                  <button type="button" onClick={() => handleLogout('recruiter')} className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">Logout</button>
                </>
              )}
              {area === 'recruiter' && !recruiterLoggedIn && (
                <>
                  <Link href="/candidate/login" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">Sign In</Link>
                  <Link href="/candidate/signup" onClick={() => setMobileOpen(false)} className="rounded-full bg-[var(--landing-accent-solid)] px-3 py-2.5 text-center text-sm font-semibold text-white">Sign up</Link>
                </>
              )}
              {area === 'candidate' && candidateLoggedIn && (
                <>
                  <div className="flex items-center gap-2 px-3 py-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--landing-muted)] bg-white/5">
                      <UserIcon className="h-4 w-4 text-[var(--landing-muted)]" />
                    </span>
                    <span className="text-sm font-medium text-[var(--landing-text)]">{candidateName || 'Account'}</span>
                  </div>
                  <Link href="/candidate/dashboard" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">Dashboard</Link>
                  <button type="button" onClick={() => handleLogout('candidate')} className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">Logout</button>
                </>
              )}
              {area === 'candidate' && !candidateLoggedIn && (
                <>
                  <Link href="/candidate/login" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">Sign In</Link>
                  <Link href="/candidate/signup" onClick={() => setMobileOpen(false)} className="rounded-full bg-[var(--landing-accent-solid)] px-3 py-2.5 text-center text-sm font-semibold text-white">Sign up</Link>
                </>
              )}
              {area === 'public' && !recruiterLoggedIn && !candidateLoggedIn && (
                <>
                  <Link href="/recruiter/login" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">Recruiter login</Link>
                  <Link href="/candidate/login" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">Login</Link>
                  <Link href="/candidate/signup" onClick={() => setMobileOpen(false)} className="rounded-full bg-[var(--landing-accent-solid)] px-3 py-2.5 text-center text-sm font-semibold text-white">Sign up</Link>
                </>
              )}
              {area === 'public' && (recruiterLoggedIn || candidateLoggedIn) && (
                <>
                  <div className="flex items-center gap-2 px-3 py-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--landing-muted)] bg-white/5">
                      <UserIcon className="h-4 w-4 text-[var(--landing-muted)]" />
                    </span>
                    <span className="text-sm font-medium text-[var(--landing-text)]">{recruiterLoggedIn ? (recruiterName || 'Recruiter') : (candidateName || 'Account')}</span>
                  </div>
                  <Link href={recruiterLoggedIn ? '/recruiter' : '/candidate/dashboard'} onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">{recruiterLoggedIn ? 'Dashboard' : 'Dashboard'}</Link>
                  <button type="button" onClick={() => handleLogout(recruiterLoggedIn ? 'recruiter' : 'candidate')} className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">Logout</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
