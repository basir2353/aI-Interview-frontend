'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CandidateAuthLayout,
  candidateAuthInputClass,
  candidateAuthLabelClass,
  candidateAuthPrimaryBtnClass,
} from '@/components/layout/CandidateAuthLayout';
import { api } from '@/lib/api';
import { clearOtherRoles } from '@/lib/session';

export default function CandidateLoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/candidate/dashboard';
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
    <CandidateAuthLayout
      title="Sign in"
      subtitle="Access your applications, interview links, and reports."
    >
      {resetSuccess && (
        <p className="mb-4 rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-3 text-sm text-[var(--success-text)]">
          Password updated. You can sign in with your new password.
        </p>
      )}
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label htmlFor="candidate-email" className={candidateAuthLabelClass}>
            Email
          </label>
          <input
            id="candidate-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className={candidateAuthInputClass}
          />
        </div>
        <div>
          <label htmlFor="candidate-password" className={candidateAuthLabelClass}>
            Password
          </label>
          <input
            id="candidate-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className={candidateAuthInputClass}
          />
        </div>
        <p className="text-right">
          <Link href="/candidate/forgot-password" className="text-sm font-medium text-[var(--accent)] hover:underline">
            Forgot password?
          </Link>
        </p>
        {error && <p className="text-sm text-[var(--error-text)]">{error}</p>}
        <button type="submit" disabled={loading} className={candidateAuthPrimaryBtnClass}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-5 text-sm text-[var(--surface-light-muted)]">
        New here?{' '}
        <Link
          href={`/candidate/signup?next=${encodeURIComponent(next)}`}
          className="font-medium text-[var(--accent)] hover:underline"
        >
          Create an account
        </Link>
      </p>
    </CandidateAuthLayout>
  );
}
