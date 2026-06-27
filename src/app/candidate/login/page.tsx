'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IntervionLogo } from '@/components/ui/IntervionLogo';
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
            <IntervionLogo className="mb-4 h-10" />
            <h1 className="text-2xl font-bold tracking-tight text-[var(--surface-light-fg)]">Candidate sign in</h1>
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
