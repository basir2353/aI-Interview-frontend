'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { CandidateSubnav } from '@/components/layout/CandidateSubnav';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, type CandidateIdentity } from '@/lib/api';

export default function CandidateProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<CandidateIdentity | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('candidateToken') : null;
    if (!token) {
      router.replace('/candidate/login?next=/candidate/profile');
      return;
    }
    api
      .candidateMe()
      .then((res) => setProfile(res.candidate))
      .catch((e) => {
        localStorage.removeItem('candidateToken');
        localStorage.removeItem('candidateName');
        localStorage.removeItem('candidateEmail');
        setError(e instanceof Error ? e.message : 'Failed to load profile');
        router.replace('/candidate/login?next=/candidate/profile');
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <AppShell
      title="Profile Details"
      subtitle="Your saved account and professional details"
      backHref="/candidate/dashboard"
      backLabel="Dashboard"
      theme="light"
      actions={
        <Button
          variant="secondary"
          size="md"
          onClick={() => {
            localStorage.removeItem('candidateToken');
            localStorage.removeItem('candidateName');
            localStorage.removeItem('candidateEmail');
            router.replace('/candidate/login');
          }}
        >
          Logout
        </Button>
      }
    >
      <div className="space-y-6">
        <CandidateSubnav />
        {loading && <p className="text-sm text-[var(--surface-light-muted)] font-medium">Loading profile…</p>}
        {error && <p className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]">{error}</p>}
        {profile && (
          <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-7 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--surface-light-fg)]">Personal Information</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" value={profile.name} />
              <Field label="Email" value={profile.email} />
              <Field label="Phone" value={profile.phone} />
              <Field label="Location" value={profile.location} />
              <Field label="LinkedIn" value={profile.linkedinUrl} />
              <Field label="Portfolio / GitHub" value={profile.portfolioUrl} />
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--surface-light-muted)]">{label}</p>
      <p className="mt-1 text-sm text-[var(--surface-light-fg)] break-words">{value || '-'}</p>
    </div>
  );
}
