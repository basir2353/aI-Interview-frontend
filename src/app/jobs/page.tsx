'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
    'rounded-xl border border-[var(--landing-border)] bg-white/5 px-4 py-3 text-sm text-[var(--landing-text)] placeholder:text-[var(--landing-muted)]/70 outline-none transition-colors focus:border-[var(--landing-accent)] focus:ring-2 focus:ring-[var(--landing-accent)]/30';

  return (
    <AppShell
      title="Open Jobs"
      subtitle="Find the right role and apply in minutes"
      backHref="/"
      backLabel="Home"
      theme="landing"
    >
      <div className="space-y-8">
        <Card className="rounded-2xl p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[var(--landing-text)] sm:text-xl">
                Search & Filter Jobs
              </h2>
              <p className="mt-1 text-sm font-medium text-[var(--landing-muted)]">
                Use filters like date, time, role, and salary to narrow results.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-[var(--landing-border)] bg-[var(--landing-accent-solid)]/20 px-3 py-1.5 text-xs font-semibold text-[var(--landing-accent)]">
                {filteredJobs.length} result{filteredJobs.length !== 1 ? 's' : ''}
              </span>
              <Button size="md" variant="secondary" onClick={resetFilters}>
                Reset filters
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search title, company, location..."
              className={inputClass}
            />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className={inputClass}
            >
              <option value="">All roles</option>
              <option value="technical">Technical</option>
              <option value="behavioral">Behavioral</option>
              <option value="sales">Sales</option>
              <option value="customer_success">Customer Success</option>
            </select>
            <input
              type="number"
              min={0}
              value={minSalary}
              onChange={(e) => setMinSalary(e.target.value)}
              placeholder="Min salary"
              className={inputClass}
            />
            <input
              type="number"
              min={0}
              value={maxSalary}
              onChange={(e) => setMaxSalary(e.target.value)}
              placeholder="Max salary"
              className={inputClass}
            />
            <input
              type="date"
              value={postedDate}
              onChange={(e) => setPostedDate(e.target.value)}
              className={inputClass}
            />
            <select
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              className={inputClass}
            >
              <option value="">Any posted time</option>
              <option value="24h">Past 24 hours</option>
              <option value="2d">Last 2 days</option>
              <option value="3d">Last 3 days</option>
              <option value="4d">Last 4 days</option>
              <option value="5d">Last 5 days</option>
              <option value="6d">Last 6 days</option>
              <option value="7d">Last 7 days</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'salary_high' | 'salary_low')}
              className={inputClass}
            >
              <option value="newest">Sort: Newest first</option>
              <option value="oldest">Sort: Oldest first</option>
              <option value="salary_high">Sort: Salary high to low</option>
              <option value="salary_low">Sort: Salary low to high</option>
            </select>
          </div>
        </Card>

        {loading && (
          <p className="text-[var(--landing-muted)] font-medium">Loading jobs…</p>
        )}
        {error && (
          <div className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]">
            {error}
          </div>
        )}
        {!loading && filteredJobs.length === 0 && (
          <Card className="rounded-2xl p-8 text-center">
            <p className="text-[var(--landing-muted)]">
              No jobs match your filters. Try adjusting your search criteria.
            </p>
          </Card>
        )}

        <div className="space-y-4">
          {filteredJobs.map((job) => {
            const status = applicationStatusByPosition[job.id] || null;
            return (
              <Card key={job.id} className="rounded-2xl p-6 transition-shadow hover:shadow-lg hover:shadow-[var(--landing-accent-solid)]/10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold tracking-tight text-[var(--landing-text)] sm:text-xl">
                      {job.title}
                    </h2>
                    {job.company_name && (
                      <span className="mt-2 inline-flex items-center rounded-full border border-[var(--landing-border)] bg-[var(--landing-accent-solid)]/15 px-3 py-1 text-xs font-semibold text-[var(--landing-accent)]">
                        {job.company_name}
                      </span>
                    )}
                    <p className="mt-2 text-sm font-medium text-[var(--landing-muted)]">
                      {roleLabel(job.role)}
                      {job.location ? ` · ${job.location}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--landing-muted)]/80">
                      Posted: {new Date(job.created_at).toLocaleString()}
                    </p>
                    {job.salary_range && (
                      <p className="mt-1 text-sm text-[var(--landing-muted)]">Salary: {job.salary_range}</p>
                    )}
                    {status && (
                      <span className="mt-2 inline-flex rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-3 py-1 text-xs font-semibold text-[var(--success-text)]">
                        Applied ({status.replaceAll('_', ' ')})
                      </span>
                    )}
                  </div>
                  <div className="shrink-0">
                    <Link href={candidateLoggedIn ? `/jobs/${job.id}/apply` : `/candidate/login?next=/jobs/${job.id}/apply`}>
                      <Button size="md" variant={status ? 'secondary' : 'primary'}>
                        {status ? 'View application' : 'Apply'}
                      </Button>
                    </Link>
                  </div>
                </div>

                {job.description && (
                  <p className="mt-4 border-t border-[var(--landing-border)]/60 pt-4 text-sm leading-6 text-[var(--landing-muted)]">
                    {job.description}
                  </p>
                )}
                {job.requirements && (
                  <p className="mt-3 text-sm leading-6 text-[var(--landing-muted)]">
                    <span className="font-semibold text-[var(--landing-text)]">Requirements:</span>{' '}
                    {job.requirements}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
