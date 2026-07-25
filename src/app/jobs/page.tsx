'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { IntervionLogo } from '@/components/ui/IntervionLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BRAND_NAME } from '@/lib/brand';
import { api, type PublicJob } from '@/lib/api';
import type { InterviewRole } from '@/types';

function roleLabel(role: InterviewRole): string {
  switch (role) {
    case 'technical':
      return 'Technical';
    case 'behavioral':
      return 'Behavioral';
    case 'sales':
      return 'Sales';
    case 'customer_success':
      return 'Customer Success';
    default:
      return role;
  }
}

function parseSalaryRange(salary: string | null): { min: number | null; max: number | null } {
  if (!salary) return { min: null, max: null };
  const matches = salary.match(/\d+(?:[.,]\d+)?/g);
  if (!matches || matches.length === 0) return { min: null, max: null };
  const values = matches
    .map((v) => Number(v.replace(/,/g, '')))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
  if (values.length === 0) return { min: null, max: null };
  if (values.length === 1) return { min: values[0], max: values[0] };
  return { min: values[0], max: values[values.length - 1] };
}

function isTimeSlotMatch(dateIso: string, slot: string): boolean {
  if (!slot) return true;
  const postedAtMs = new Date(dateIso).getTime();
  const now = Date.now();
  const diffMs = now - postedAtMs;
  const dayMs = 24 * 60 * 60 * 1000;
  if (slot === '24h') return diffMs <= dayMs;
  if (slot === '2d') return diffMs <= 2 * dayMs;
  if (slot === '3d') return diffMs <= 3 * dayMs;
  if (slot === '4d') return diffMs <= 4 * dayMs;
  if (slot === '5d') return diffMs <= 5 * dayMs;
  if (slot === '6d') return diffMs <= 6 * dayMs;
  if (slot === '7d') return diffMs <= 7 * dayMs;
  return true;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [candidateLoggedIn, setCandidateLoggedIn] = useState(false);
  const [applicationStatusByPosition, setApplicationStatusByPosition] = useState<Record<string, string>>({});
  const [searchText, setSearchText] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [postedDate, setPostedDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'salary_high' | 'salary_low'>('newest');

  useEffect(() => {
    document.documentElement.setAttribute('data-dashboard-app', 'candidate');
    return () => document.documentElement.removeAttribute('data-dashboard-app');
  }, []);

  useEffect(() => {
    api
      .publicGetJobs()
      .then((res) => setJobs(res.jobs))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load jobs'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('candidateToken');
    if (!token) {
      setCandidateLoggedIn(false);
      setApplicationStatusByPosition({});
      return;
    }
    setCandidateLoggedIn(true);
    api
      .candidateGetApplications()
      .then((res) => {
        const next: Record<string, string> = {};
        for (const app of res.applications) {
          if (!next[app.position_id]) next[app.position_id] = app.status;
        }
        setApplicationStatusByPosition(next);
      })
      .catch(() => {
        localStorage.removeItem('candidateToken');
        localStorage.removeItem('candidateName');
        localStorage.removeItem('candidateEmail');
        setCandidateLoggedIn(false);
        setApplicationStatusByPosition({});
      });
  }, []);

  const filteredJobs = useMemo(() => {
    const minSalaryFilter = minSalary ? Number(minSalary) : null;
    const maxSalaryFilter = maxSalary ? Number(maxSalary) : null;
    const exactDateStart = postedDate ? new Date(`${postedDate}T00:00:00`).getTime() : null;
    const exactDateEnd = postedDate ? new Date(`${postedDate}T23:59:59`).getTime() : null;
    const query = searchText.trim().toLowerCase();

    const next = jobs.filter((job) => {
      if (selectedRole && job.role !== selectedRole) return false;
      if (query) {
        const haystack = `${job.title} ${job.company_name ?? ''} ${job.location ?? ''} ${job.description ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      const createdAtMs = new Date(job.created_at).getTime();
      if (exactDateStart && createdAtMs < exactDateStart) return false;
      if (exactDateEnd && createdAtMs > exactDateEnd) return false;
      if (!isTimeSlotMatch(job.created_at, timeSlot)) return false;
      const salary = parseSalaryRange(job.salary_range);
      if (minSalaryFilter !== null && salary.max !== null && salary.max < minSalaryFilter) return false;
      if (maxSalaryFilter !== null && salary.min !== null && salary.min > maxSalaryFilter) return false;
      if (minSalaryFilter !== null && maxSalaryFilter !== null && salary.min === null && salary.max === null) return false;
      return true;
    });

    next.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      const aSalary = parseSalaryRange(a.salary_range);
      const bSalary = parseSalaryRange(b.salary_range);
      const aPivot = aSalary.max ?? aSalary.min ?? -1;
      const bPivot = bSalary.max ?? bSalary.min ?? -1;
      if (sortBy === 'salary_high') return bPivot - aPivot;
      return aPivot - bPivot;
    });

    return next;
  }, [jobs, selectedRole, searchText, minSalary, maxSalary, postedDate, timeSlot, sortBy]);

  const resetFilters = () => {
    setSearchText('');
    setSelectedRole('');
    setMinSalary('');
    setMaxSalary('');
    setPostedDate('');
    setTimeSlot('');
    setSortBy('newest');
  };

  const inputClass =
    'rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-2.5 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]';

  return (
    <div className="min-h-screen bg-[var(--surface-light)] text-[var(--surface-light-fg)]">
      <header className="border-b border-[var(--surface-light-border)] bg-[var(--surface-light-card)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <IntervionLogo className="h-8" />
            <span className="font-display text-sm font-semibold tracking-tight">{BRAND_NAME}</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {candidateLoggedIn ? (
              <Link
                href="/candidate/dashboard"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--surface-light-muted)] hover:text-[var(--surface-light-fg)]"
              >
                My workspace
              </Link>
            ) : (
              <Link
                href="/candidate/login?next=/jobs"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--surface-light-muted)] hover:text-[var(--surface-light-fg)]"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Open roles</h1>
          <p className="mt-2 text-sm text-[var(--surface-light-muted)] sm:text-base">Find a role and apply in a few minutes.</p>
        </div>

        <section className="mb-8 rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--surface-light-muted)]">
              {filteredJobs.length} result{filteredJobs.length !== 1 ? 's' : ''}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-medium text-[var(--accent)] hover:underline"
            >
              Reset filters
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search title, company…"
              className={inputClass}
            />
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className={inputClass}>
              <option value="">All roles</option>
              <option value="technical">Technical</option>
              <option value="behavioral">Behavioral</option>
              <option value="sales">Sales</option>
              <option value="customer_success">Customer Success</option>
            </select>
            <input type="number" min={0} value={minSalary} onChange={(e) => setMinSalary(e.target.value)} placeholder="Min salary" className={inputClass} />
            <input type="number" min={0} value={maxSalary} onChange={(e) => setMaxSalary(e.target.value)} placeholder="Max salary" className={inputClass} />
            <input type="date" value={postedDate} onChange={(e) => setPostedDate(e.target.value)} className={inputClass} />
            <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} className={inputClass}>
              <option value="">Any posted time</option>
              <option value="24h">Past 24 hours</option>
              <option value="2d">Last 2 days</option>
              <option value="3d">Last 3 days</option>
              <option value="7d">Last 7 days</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className={inputClass}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="salary_high">Salary high → low</option>
              <option value="salary_low">Salary low → high</option>
            </select>
          </div>
        </section>

        {loading && <p className="text-sm text-[var(--surface-light-muted)]">Loading jobs…</p>}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {!loading && filteredJobs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-6 py-12 text-center text-sm text-[var(--surface-light-muted)]">
            No jobs match your filters.
          </div>
        )}

        <div className="space-y-3">
          {filteredJobs.map((job) => {
            const status = applicationStatusByPosition[job.id] || null;
            return (
              <article
                key={job.id}
                className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-5 transition hover:border-[var(--surface-light-border)] sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg font-semibold tracking-tight text-[var(--surface-light-fg)]">
                      {job.title}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--surface-light-muted)]">
                      {job.company_name ? `${job.company_name} · ` : ''}
                      {roleLabel(job.role)}
                      {job.location ? ` · ${job.location}` : ''}
                    </p>
                    {job.salary_range && (
                      <p className="mt-1 text-sm text-[var(--surface-light-muted)]">{job.salary_range}</p>
                    )}
                    {status && (
                      <p className="mt-2 text-xs font-medium capitalize text-emerald-700">
                        Applied · {status.replaceAll('_', ' ')}
                      </p>
                    )}
                  </div>
                  <Link
                    href={
                      candidateLoggedIn ? `/jobs/${job.id}/apply` : `/candidate/login?next=/jobs/${job.id}/apply`
                    }
                    className={`shrink-0 rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition ${
                      status
                        ? 'border border-[var(--surface-light-border)] text-[var(--surface-light-fg)] hover:bg-[var(--surface-light)]'
                        : 'bg-[var(--surface-light-fg)] text-[var(--surface-light-card)] hover:opacity-90'
                    }`}
                  >
                    {status ? 'View application' : 'Apply'}
                  </Link>
                </div>
                {job.description && (
                  <p className="mt-4 border-t border-[var(--surface-light-border)] pt-4 text-sm leading-relaxed text-[var(--surface-light-muted)] line-clamp-3">
                    {job.description}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
