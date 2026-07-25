'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CandidateShell } from '@/components/layout/CandidateShell';
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
    <CandidateShell title="Profile" subtitle="Account details used when you apply to roles.">
      {loading && <p className="text-sm font-medium text-[#64748b]">Loading profile…</p>}
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {profile && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-7">
            <h2 className="font-display text-base font-semibold text-[#0f172a]">Identity</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field label="Full name" value={profile.name} />
              <Field label="Email" value={profile.email} />
            </dl>
          </section>
          <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-7">
            <h2 className="font-display text-base font-semibold text-[#0f172a]">Contact</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field label="Phone" value={profile.phone} />
              <Field label="Location" value={profile.location} />
            </dl>
          </section>
          <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-7">
            <h2 className="font-display text-base font-semibold text-[#0f172a]">Links</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field label="LinkedIn" value={profile.linkedinUrl} link />
              <Field label="Portfolio / GitHub" value={profile.portfolioUrl} link />
            </dl>
          </section>
        </div>
      )}
    </CandidateShell>
  );
}

function Field({
  label,
  value,
  link,
}: {
  label: string;
  value: string | null | undefined;
  link?: boolean;
}) {
  const display = value?.trim() || '—';
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">{label}</dt>
      <dd className="mt-1.5 text-sm text-[#0f172a] break-words">
        {link && value?.trim() ? (
          <a href={value} target="_blank" rel="noreferrer" className="text-[#5b5bd6] hover:underline">
            {display}
          </a>
        ) : (
          display
        )}
      </dd>
    </div>
  );
}
