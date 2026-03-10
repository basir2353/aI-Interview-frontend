'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { clearOtherRoles } from '@/lib/session';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.adminLogin(email, password);
      if (typeof window !== 'undefined') {
        clearOtherRoles('admin');
        localStorage.setItem('adminToken', res.token);
        localStorage.setItem('adminEmail', res.email);
      }
      router.push('/admin');
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">AI Interviewer</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--surface-light-fg)]">Admin sign in</h1>
              <p className="mt-2 text-sm font-medium text-[var(--surface-light-muted)]">
                Manage recruiters, candidates, and platform settings.
              </p>
            </div>

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
                  placeholder="admin@example.com"
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

            <p className="mt-6 border-t border-[var(--surface-light-border)] pt-6 text-center text-xs font-medium text-[var(--surface-light-muted)]">
              <strong>Super admin:</strong> Use ADMIN_EMAIL and ADMIN_PASSWORD from backend .env (default: admin@example.com / admin123).
              <br />
              <span className="mt-1 block">After login, go to <strong>Admins</strong> in the sidebar to add more admins.</span>
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
