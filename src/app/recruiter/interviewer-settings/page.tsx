'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { InterviewerPersona } from '@/types';
import { AppShell } from '@/components/layout/AppShell';
import { RecruiterSubnav } from '@/components/layout/RecruiterSubnav';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const PERSONAS: { value: InterviewerPersona; label: string; hint: string }[] = [
  { value: 'ethan', label: 'Ethan', hint: 'Default technical-style presenter for most interviews.' },
  { value: 'zara', label: 'ZaraAlex', hint: 'Alternative AI interviewer persona for a different tone.' },
];

/**
 * Recruiter branding: company name on file and default AI interviewer (Ethan unless changed).
 */
export default function RecruiterInterviewerSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [interviewerPersona, setInterviewerPersona] = useState<InterviewerPersona>('ethan');
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('recruiterToken') : null;
    if (!token) {
      router.replace('/recruiter/login');
      return;
    }
    api
      .recruiterMe()
      .then(({ recruiter }) => {
        setCompanyName(recruiter.companyName ?? '');
        setInterviewerPersona(recruiter.interviewerPersona ?? 'ethan');
      })
      .catch(() => {
        localStorage.removeItem('recruiterToken');
        router.replace('/recruiter/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.recruiterPatchMe({
        companyName: companyName.trim() || null,
        interviewerPersona,
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2400);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('recruiterCompanyName', companyName.trim());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-light)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)]/20 border-t-[var(--accent)]" />
      </div>
    );
  }

  return (
    <AppShell
      title="AI interviewer & company"
      subtitle="Candidates see this interviewer in scheduled interviews. Company name is stored on your recruiter profile."
      backHref="/recruiter"
      backLabel="Dashboard"
      theme="light"
    >
      <div className="mx-auto max-w-lg space-y-6">
        <RecruiterSubnav />

        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6 shadow-sm">
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label htmlFor="company" className="mb-1.5 block text-sm font-semibold text-[var(--surface-light-fg)]">
                Company name
              </label>
              <input
                id="company"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                maxLength={255}
                placeholder="e.g. Acme Robotics"
                className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
              />
              <p className="mt-1.5 text-xs text-[var(--surface-light-muted)]">
                Shown with schedule details where supported. Distinct from individual job postings.
              </p>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-[var(--surface-light-fg)]">Default AI interviewer</legend>
              <p className="mb-3 text-xs text-[var(--surface-light-muted)]">
                New scheduled interviews use this model unless you pick another when scheduling. <strong>Ethan</strong> is the default.
              </p>
              <div className="space-y-2">
                {PERSONAS.map((p) => (
                  <label
                    key={p.value}
                    className={`flex cursor-pointer gap-3 rounded-xl border px-4 py-3 transition ${
                      interviewerPersona === p.value
                        ? 'border-[var(--accent)] bg-[var(--accent-muted)] ring-1 ring-[var(--accent)]'
                        : 'border-[var(--surface-light-border)] bg-[var(--surface-light-card)] hover:bg-[var(--accent-muted)]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="persona"
                      value={p.value}
                      checked={interviewerPersona === p.value}
                      onChange={() => setInterviewerPersona(p.value)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-semibold text-[var(--surface-light-fg)]">{p.label}</p>
                      <p className="text-xs text-[var(--surface-light-muted)]">{p.hint}</p>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>

            {error && (
              <p className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-2 text-sm text-[var(--error-text)]">{error}</p>
            )}
            {savedFlash && (
              <p className="text-sm font-medium text-[var(--success-text)]">Settings saved.</p>
            )}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={saving} className="disabled:opacity-50">
                {saving ? 'Saving…' : 'Save settings'}
              </Button>
              <Link
                href="/recruiter"
                className="inline-flex items-center rounded-xl border border-[var(--surface-light-border)] px-4 py-2 text-sm font-semibold text-[var(--surface-light-fg)] hover:bg-[var(--accent-muted)]"
              >
                Back to dashboard
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
