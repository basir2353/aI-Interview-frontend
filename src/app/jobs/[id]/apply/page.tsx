'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { api, type PublicJob } from '@/lib/api';

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
      await api.publicApplyToJob(jobId, {
        name,
        email,
        phone: phone || undefined,
        location: location || undefined,
        linkedinUrl: linkedinUrl || undefined,
        portfolioUrl: portfolioUrl || undefined,
        resumeUrl: uploadedResumeUrl,
        coverLetter: coverLetter || undefined,
      });
      router.push('/jobs');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit application');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <AppShell title="Apply for Job" subtitle="Complete your profile and upload resume" backHref="/jobs" backLabel="Jobs" theme="light">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-5">
        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6 lg:col-span-2">
          {loading && <p className="text-sm text-[var(--surface-light-muted)] font-medium">Loading job details…</p>}
          {!loading && job && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-[var(--surface-light-fg)]">{job.title}</h2>
              {job.company_name && (
                <p className="inline-flex items-center rounded-full border border-[var(--surface-light-border)] bg-[var(--accent-muted)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                  {job.company_name}
                </p>
              )}
              <p className="text-sm text-[var(--surface-light-muted)]">
                {job.role} {job.location ? `• ${job.location}` : ''}
              </p>
              {job.salary_range && <p className="text-sm text-[var(--surface-light-muted)]">Salary: {job.salary_range}</p>}
              {job.description && <p className="pt-2 text-sm leading-6 text-[var(--surface-light-fg)]">{job.description}</p>}
            </div>
          )}
        </Card>

        <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6 lg:col-span-3">
          <h3 className="text-lg font-semibold text-[var(--surface-light-fg)]">Application Form</h3>
          <p className="mt-1 text-sm text-[var(--surface-light-muted)] font-medium">Upload your resume and fill in your details.</p>

          <form className="mt-5 grid gap-4" onSubmit={submitApplication}>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name *"
              className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address *"
              className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Current location"
              className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="LinkedIn profile URL"
              className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            <input
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="Portfolio / GitHub URL"
              className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />

            <div className="rounded-xl border border-dashed border-[var(--surface-light-border)] bg-[var(--accent-muted)] p-4">
              <label className="mb-2 block text-sm font-medium text-[var(--surface-light-fg)]">Upload resume (PDF/DOC/DOCX) *</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  void handleResumeUpload(file);
                }}
                className="block w-full text-sm text-[var(--surface-light-fg)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--accent-hover)]"
              />
              {uploadingResume && <p className="mt-2 text-xs font-medium text-[var(--surface-light-muted)]">Uploading resume…</p>}
              {uploadedResumeUrl && <p className="mt-2 text-xs text-[var(--success-text)]">Resume uploaded successfully.</p>}
            </div>

            <textarea
              rows={5}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Cover letter / why you are a good fit"
              className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />

            {error && (
              <p className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]">{error}</p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={submitLoading || uploadingResume} size="md" className="disabled:opacity-50">
                {submitLoading ? 'Submitting…' : 'Submit application'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
