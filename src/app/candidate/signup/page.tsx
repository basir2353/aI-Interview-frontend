'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IntervionLogo } from '@/components/ui/IntervionLogo';
import { api } from '@/lib/api';
import { clearOtherRoles } from '@/lib/session';

export default function CandidateSignupPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/candidate/dashboard';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.candidateSignup({
        name,
        email,
        password,
        phone: phone || undefined,
        location: location || undefined,
        linkedinUrl: linkedinUrl || undefined,
        portfolioUrl: portfolioUrl || undefined,
      });
      if (typeof window !== 'undefined') {
        clearOtherRoles('candidate');
        localStorage.setItem('candidateToken', res.token);
        localStorage.setItem('candidateName', res.candidate.name ?? '');
        localStorage.setItem('candidateEmail', res.candidate.email ?? '');
      }
      toast.success('Account created! Check your email for a welcome message.');
      router.push(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-light)] px-4 py-12">
      <div className="w-full max-w-2xl">
        <Card className="rounded-3xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-8 shadow-lg">
          <div className="mb-8 flex flex-col items-center text-center">
            <IntervionLogo className="mb-4 h-10" />
            <h1 className="text-2xl font-bold tracking-tight text-[var(--surface-light-fg)]">Create your account</h1>
            <p className="mt-2 text-sm font-medium text-[var(--surface-light-muted)]">One profile. Apply to jobs faster and track your applications.</p>
          </div>
          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={submit}>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name *"
              className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email *"
              className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 chars) *"
              className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="LinkedIn URL"
              className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <input
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="Portfolio/GitHub URL"
              className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)] md:col-span-2"
            />
            {error && <p className="text-sm text-[var(--error-text)] md:col-span-2">{error}</p>}
            <div className="md:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating account…' : 'Create account'}
              </Button>
            </div>
          </form>
          <p className="mt-5 text-sm text-[var(--surface-light-muted)]">
            Already have an account?{' '}
            <Link href={`/candidate/login?next=${encodeURIComponent(next)}`} className="font-medium text-[var(--accent)] hover:underline">
              Login
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
