'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { IntervionLogo } from '@/components/ui/IntervionLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { api, type PublicJob } from '@/lib/api';

const fieldClass =
  'w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]';
const labelClass = 'mb-1.5 block text-sm font-medium text-[var(--surface-light-fg)]';

export default function ApplyJobPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const jobId = params.id;
  const nextPath = jobId ? `/jobs/${jobId}/apply` : '/jobs';

  const [job, setJob] = useState<PublicJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [uploadedResumeUrl, setUploadedResumeUrl] = useState('');
  const [uploadingResume, setUploadingResume] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-dashboard-app', 'candidate');
    return () => document.documentElement.removeAttribute('data-dashboard-app');
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('candidateToken');
      if (!token) {
        router.replace(`/candidate/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }
      api
        .candidateMe()
        .then((res) => {
          setName(res.candidate.name ?? '');
          setEmail(res.candidate.email ?? '');
          setPhone(res.candidate.phone ?? '');
          setLocation(res.candidate.location ?? '');
          setLinkedinUrl(res.candidate.linkedinUrl ?? '');
          setPortfolioUrl(res.candidate.portfolioUrl ?? '');
        })
        .catch(() => {
          localStorage.removeItem('candidateToken');
          localStorage.removeItem('candidateName');
          localStorage.removeItem('candidateEmail');
          router.replace(`/candidate/login?next=${encodeURIComponent(nextPath)}`);
        });
    }
    if (!jobId) return;
    api
      .publicGetJob(jobId)
      .then((res) => setJob(res.job))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load job'))
      .finally(() => setLoading(false));
  }, [jobId, nextPath, router]);

  const handleResumeUpload = async (file: File | null) => {
    if (!file) return;
    setError('');
    setUploadingResume(true);
    try {
      const res = await api.publicUploadResume(file);
      setUploadedResumeUrl(res.resumeUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload resume');
    } finally {
      setUploadingResume(false);
    }
  };

  const submitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedResumeUrl) {
      setError('Please upload your resume before submitting.');
      return;
    }
    setError('');
    setSubmitLoading(true);
    try {
      const res = await api.publicApplyToJob(jobId, {
        name,
        email,
        phone: phone || undefined,
        location: location || undefined,
        linkedinUrl: linkedinUrl || undefined,
        portfolioUrl: portfolioUrl || undefined,
        resumeUrl: uploadedResumeUrl,
        coverLetter: coverLetter || undefined,
      });
      if (res.interviewScheduled) {
        toast.success('Application submitted! Your interview is scheduled — check your email.');
      } else {
        toast.success('Application submitted! We emailed you a confirmation.');
      }
      router.push('/candidate/applications?submitted=1');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit application');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-light)] text-[var(--surface-light-fg)]">
      <header className="border-b border-[var(--surface-light-border)] bg-[var(--surface-light-card)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/jobs" className="flex items-center gap-2 text-sm font-medium text-[var(--surface-light-muted)] hover:text-[var(--surface-light-fg)]">
            ← Jobs
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <IntervionLogo className="h-7" />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-5">
        <aside className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6 lg:col-span-2">
          {loading && <p className="text-sm text-[var(--surface-light-muted)]">Loading job…</p>}
          {!loading && job && (
            <div className="space-y-3">
              <h1 className="font-display text-xl font-semibold tracking-tight">{job.title}</h1>
              {job.company_name && <p className="text-sm font-medium text-[var(--surface-light-muted)]">{job.company_name}</p>}
              <p className="text-sm text-[var(--surface-light-muted)]">
                {job.role}
                {job.location ? ` · ${job.location}` : ''}
              </p>
              {job.salary_range && <p className="text-sm text-[var(--surface-light-muted)]">{job.salary_range}</p>}
              {job.description && (
                <p className="border-t border-[var(--surface-light-border)] pt-4 text-sm leading-relaxed text-[var(--surface-light-muted)]">{job.description}</p>
              )}
            </div>
          )}
        </aside>

        <section className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6 lg:col-span-3">
          <h2 className="font-display text-lg font-semibold">Your application</h2>
          <p className="mt-1 text-sm text-[var(--surface-light-muted)]">Upload a resume and confirm your details.</p>

          <form className="mt-6 grid gap-4" onSubmit={submitApplication}>
            <div>
              <label htmlFor="ap-name" className={labelClass}>
                Full name
              </label>
              <input id="ap-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="ap-email" className={labelClass}>
                Email
              </label>
              <input id="ap-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="ap-phone" className={labelClass}>
                Phone
              </label>
              <input id="ap-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="ap-location" className={labelClass}>
                Location
              </label>
              <input id="ap-location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="ap-li" className={labelClass}>
                LinkedIn URL
              </label>
              <input id="ap-li" type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="ap-pf" className={labelClass}>
                Portfolio / GitHub
              </label>
              <input id="ap-pf" type="url" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} className={fieldClass} />
            </div>

            <div className="rounded-xl border border-dashed border-[var(--surface-light-border)] bg-[var(--surface-light)] p-4">
              <label className={labelClass}>Resume (PDF / DOC / DOCX)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                  void handleResumeUpload(e.target.files?.[0] ?? null);
                }}
                className="block w-full text-sm text-[var(--surface-light-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface-light-fg)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--surface-light-card)]"
              />
              {uploadingResume && <p className="mt-2 text-xs text-[var(--surface-light-muted)]">Uploading…</p>}
              {uploadedResumeUrl && <p className="mt-2 text-xs text-emerald-700">Resume uploaded.</p>}
            </div>

            <div>
              <label htmlFor="ap-cover" className={labelClass}>
                Cover letter
              </label>
              <textarea
                id="ap-cover"
                rows={5}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Optional — why you’re a strong fit"
                className={fieldClass}
              />
            </div>

            {error && (
              <p className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitLoading || uploadingResume}
              className="rounded-xl bg-[var(--surface-light-fg)] px-5 py-3 text-sm font-semibold text-[var(--surface-light-card)] transition hover:opacity-90 disabled:opacity-60"
            >
              {submitLoading ? 'Submitting…' : 'Submit application'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
