'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

type Step = 'email' | 'code' | 'password';

function ForgotPasswordContent() {
  const router = useRouter();
  const search = useSearchParams();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const stepParam = search.get('step');
    const emailParam = search.get('email');
    if (stepParam === 'code' && emailParam) {
      setStep('code');
      setEmail(decodeURIComponent(emailParam));
    }
  }, [search]);

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await api.candidateForgotPassword(email.trim().toLowerCase());
      setSuccess(res.message || 'Check your email for a 6-digit code. If you don’t see it, check spam.');
      setStep('code');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStep('password');
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.candidateResetPassword(email, code.trim(), newPassword);
      setSuccess('Password updated. Redirecting to login…');
      setTimeout(() => router.push('/candidate/login?reset=1'), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update password');
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">AI Interviewer</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--surface-light-fg)]">Reset your password</h1>
            <p className="mt-2 text-sm font-medium text-[var(--surface-light-muted)]">
              {step === 'email' && 'Enter your email and we’ll send you a secure reset code.'}
              {step === 'code' && 'Enter the 6-digit code we sent to your email.'}
              {step === 'password' && 'Choose a new password.'}
            </p>
          </div>

          {step === 'email' && (
            <form className="mt-6 space-y-4" onSubmit={submitEmail}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
              />
              {error && <p className="text-sm text-[var(--error-text)]">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full justify-center">
                {loading ? 'Sending…' : 'Send reset code'}
              </Button>
            </form>
          )}

          {step === 'code' && (
            <form className="mt-6 space-y-4" onSubmit={submitCode}>
              {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit code"
                className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-center text-lg tracking-[0.3em] text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
              />
              <input type="hidden" value={email} readOnly />
              {error && <p className="text-sm text-[var(--error-text)]">{error}</p>}
              <Button type="submit" disabled={code.length !== 6} className="w-full justify-center">
                Continue
              </Button>
              <p className="text-center text-sm text-[var(--surface-light-muted)]">
                Didn’t get the email?{' '}
                <button
                  type="button"
                  onClick={() => { setStep('email'); setCode(''); setSuccess(''); }}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  Try again
                </button>
              </p>
            </form>
          )}

          {step === 'password' && (
            <form className="mt-6 space-y-4" onSubmit={submitPassword}>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 6 characters)"
                className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
              />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
              />
              {error && <p className="text-sm text-[var(--error-text)]">{error}</p>}
              {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}
              <Button type="submit" disabled={loading} className="w-full justify-center">
                {loading ? 'Updating…' : 'Update password'}
              </Button>
            </form>
          )}

          <p className="mt-5 text-sm text-[var(--surface-light-muted)]">
            <Link href="/candidate/login" className="font-medium text-[var(--accent)] hover:underline">
              Back to login
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
