'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { clearOtherRoles } from '@/lib/session';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function RecruiterLoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const resetSuccess = search.get('reset') === '1';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.recruiterLogin(email, password);
      if (typeof window !== 'undefined') {
        clearOtherRoles('recruiter');
        localStorage.setItem('recruiterToken', res.token);
        localStorage.setItem('recruiterEmail', res.recruiter.email);
        localStorage.setItem('recruiterName', res.recruiter.name ?? '');
      }
      router.push('/recruiter');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-light)]">
      <header className="border-b border-[var(--surface-light-border)] bg-[var(--surface-light-card)]">
        <div className="container mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="text-sm font-medium text-[var(--surface-light-muted)] transition-colors hover:text-[var(--surface-light-fg)]"
          >
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-8 shadow-sm">
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-md">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">AI Interviewer</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--surface-light-fg)]">Recruiter sign in</h1>
              <p className="mt-2 text-sm font-medium text-[var(--surface-light-muted)]">
                Sign in to create jobs, schedule interviews, and track candidates.
              </p>
            </div>

            {resetSuccess && (
              <div className="mb-4 rounded-xl bg-green-100 dark:bg-green-900/30 px-4 py-3 text-sm text-green-800 dark:text-green-200">
                Password updated. You can sign in with your new password.
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-[var(--surface-light-fg)]">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)] placeholder-[var(--surface-light-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                  placeholder="recruiter@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-[var(--surface-light-fg)]">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)] placeholder-[var(--surface-light-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                  placeholder="••••••••"
                />
                <p className="mt-1.5 text-right">
                  <Link href="/recruiter/forgot-password" className="text-sm font-medium text-[var(--accent)] hover:underline">
                    Forgot password?
                  </Link>
                </p>
              </div>
              {error && (
                <div className="rounded-xl bg-[var(--error-bg)] px-4 py-3 text-sm font-medium text-[var(--error-text)]">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full justify-center py-3.5 disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}
