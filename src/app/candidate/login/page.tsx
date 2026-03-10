'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { clearOtherRoles } from '@/lib/session';

export default function CandidateLoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/jobs';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const resetSuccess = search.get('reset') === '1';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.candidateLogin(email, password);
      if (typeof window !== 'undefined') {
        clearOtherRoles('candidate');
        localStorage.setItem('candidateToken', res.token);
        localStorage.setItem('candidateName', res.candidate.name ?? '');
        localStorage.setItem('candidateEmail', res.candidate.email ?? '');
      }
      router.push(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-light)] px-4 py-12">
      <div className="w-full max-w-md">
        <Card className="rounded-3xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-8 shadow-lg">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-md">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">AI Interviewer</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--surface-light-fg)]">Candidate sign in</h1>
            <p className="mt-2 text-sm font-medium text-[var(--surface-light-muted)]">Log in to apply for jobs and track your applications.</p>
          </div>
          {resetSuccess && (
            <p className="mt-4 rounded-xl bg-green-100 dark:bg-green-900/30 px-4 py-3 text-sm text-green-800 dark:text-green-200">
              Password updated. You can log in with your new password.
            </p>
          )}
          <form className="space-y-5" onSubmit={submit}>
            <div>
              <label htmlFor="candidate-email" className="mb-1.5 block text-sm font-semibold text-[var(--surface-light-fg)]">Email</label>
              <input
                id="candidate-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)] placeholder-[var(--surface-light-muted)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
              />
            </div>
            <div>
              <label htmlFor="candidate-password" className="mb-1.5 block text-sm font-semibold text-[var(--surface-light-fg)]">Password</label>
              <input
                id="candidate-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)] placeholder-[var(--surface-light-muted)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
              />
            </div>
            <p className="text-right">
              <Link href="/candidate/forgot-password" className="text-sm font-medium text-[var(--accent)] hover:underline">
                Forgot password?
              </Link>
            </p>
            {error && <p className="text-sm text-[var(--error-text)]">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full justify-center">
              {loading ? 'Logging in…' : 'Login'}
            </Button>
          </form>
          <p className="mt-5 text-sm text-[var(--surface-light-muted)]">
            New user?{' '}
            <Link href={`/candidate/signup?next=${encodeURIComponent(next)}`} className="font-medium text-[var(--accent)] hover:underline">
              Create account
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
