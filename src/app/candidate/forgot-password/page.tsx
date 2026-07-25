'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CandidateAuthLayout,
  candidateAuthInputClass,
  candidateAuthLabelClass,
  candidateAuthPrimaryBtnClass,
} from '@/components/layout/CandidateAuthLayout';
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

  const subtitle =
    step === 'email'
      ? 'Enter your email and we’ll send a secure reset code.'
      : step === 'code'
        ? 'Enter the 6-digit code we sent to your email.'
        : 'Choose a new password for your account.';

  return (
    <CandidateAuthLayout title="Reset password" subtitle={subtitle}>
      {step === 'email' && (
        <form className="space-y-4" onSubmit={submitEmail}>
          <div>
            <label htmlFor="fp-email" className={candidateAuthLabelClass}>
              Email
            </label>
            <input
              id="fp-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={candidateAuthInputClass}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className={candidateAuthPrimaryBtnClass}>
            {loading ? 'Sending…' : 'Send reset code'}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form className="space-y-4" onSubmit={submitCode}>
          {success && <p className="text-sm text-emerald-700">{success}</p>}
          <div>
            <label htmlFor="fp-code" className={candidateAuthLabelClass}>
              6-digit code
            </label>
            <input
              id="fp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className={`${candidateAuthInputClass} text-center text-lg tracking-[0.3em]`}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={code.length !== 6} className={candidateAuthPrimaryBtnClass}>
            Continue
          </button>
          <p className="text-center text-sm text-[#64748b]">
            Didn’t get the email?{' '}
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
                setSuccess('');
              }}
              className="font-medium text-[#5b5bd6] hover:underline"
            >
              Try again
            </button>
          </p>
        </form>
      )}

      {step === 'password' && (
        <form className="space-y-4" onSubmit={submitPassword}>
          <div>
            <label htmlFor="fp-new" className={candidateAuthLabelClass}>
              New password
            </label>
            <input
              id="fp-new"
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={candidateAuthInputClass}
            />
          </div>
          <div>
            <label htmlFor="fp-confirm" className={candidateAuthLabelClass}>
              Confirm password
            </label>
            <input
              id="fp-confirm"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={candidateAuthInputClass}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-700">{success}</p>}
          <button type="submit" disabled={loading} className={candidateAuthPrimaryBtnClass}>
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      )}

      <p className="mt-5 text-sm text-[#64748b]">
        <Link href="/candidate/login" className="font-medium text-[#5b5bd6] hover:underline">
          Back to sign in
        </Link>
      </p>
    </CandidateAuthLayout>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#f4f6f8]">Loading…</div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
