'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { InterviewRole } from '@/types';
import { AppShell } from '@/components/layout/AppShell';

const ROLES: { value: InterviewRole; label: string }[] = [
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'sales', label: 'Sales' },
  { value: 'customer_success', label: 'Customer Success' },
];

export default function StartInterviewPage() {
  const router = useRouter();
  const [role, setRole] = useState<InterviewRole>('technical');
  const [candidateId, setCandidateId] = useState('11111111-1111-4111-8111-111111111111');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.startInterview({ candidateId, role });
      router.push(`/interview/${res.interviewId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start interview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Start Interview" backHref="/" backLabel="Home">
      <div className="mx-auto max-w-md">
        <div className="glass-card rounded-2xl p-8 shadow-card">
          <h2 className="mb-6 text-xl font-semibold text-white">Interview setup</h2>

          <label className="mb-2 block text-sm font-medium text-gray-300">Candidate ID</label>
          <input
            type="text"
            value={candidateId}
            onChange={(e) => setCandidateId(e.target.value)}
            className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            placeholder="UUID (use seed for demo)"
          />

          <label className="mb-2 block text-sm font-medium text-gray-300">Interview type</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as InterviewRole)}
            className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-gray-100 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          {role === 'technical' && (
            <p className="mb-4 flex items-start gap-2 text-xs text-gray-400">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Technical interviews include a code editor to write and run JavaScript.
            </p>
          )}

          {error && <p className="mb-4 text-sm text-[var(--error-text)]">{error}</p>}

          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full rounded-xl bg-primary-600 py-3 font-medium text-white transition-colors hover:bg-primary-500 disabled:opacity-50"
          >
            {loading ? 'Starting…' : 'Start interview'}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
