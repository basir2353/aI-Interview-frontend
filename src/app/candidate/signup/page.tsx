'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  CandidateAuthLayout,
  candidateAuthInputClass,
  candidateAuthLabelClass,
  candidateAuthPrimaryBtnClass,
} from '@/components/layout/CandidateAuthLayout';
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
    <CandidateAuthLayout
      wide
      title="Create your account"
      subtitle="One profile to apply faster and track every application."
    >
      <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
        <div>
          <label htmlFor="su-name" className={candidateAuthLabelClass}>
            Full name
          </label>
          <input
            id="su-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={candidateAuthInputClass}
          />
        </div>
        <div>
          <label htmlFor="su-email" className={candidateAuthLabelClass}>
            Email
          </label>
          <input
            id="su-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={candidateAuthInputClass}
          />
        </div>
        <div>
          <label htmlFor="su-password" className={candidateAuthLabelClass}>
            Password
          </label>
          <input
            id="su-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className={candidateAuthInputClass}
          />
        </div>
        <div>
          <label htmlFor="su-phone" className={candidateAuthLabelClass}>
            Phone
          </label>
          <input
            id="su-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={candidateAuthInputClass}
          />
        </div>
        <div>
          <label htmlFor="su-location" className={candidateAuthLabelClass}>
            Location
          </label>
          <input
            id="su-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={candidateAuthInputClass}
          />
        </div>
        <div>
          <label htmlFor="su-linkedin" className={candidateAuthLabelClass}>
            LinkedIn URL
          </label>
          <input
            id="su-linkedin"
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            className={candidateAuthInputClass}
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="su-portfolio" className={candidateAuthLabelClass}>
            Portfolio / GitHub URL
          </label>
          <input
            id="su-portfolio"
            type="url"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            className={candidateAuthInputClass}
          />
        </div>
        {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
        <div className="md:col-span-2">
          <button type="submit" disabled={loading} className={candidateAuthPrimaryBtnClass}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </div>
      </form>
      <p className="mt-5 text-sm text-[#64748b]">
        Already have an account?{' '}
        <Link
          href={`/candidate/login?next=${encodeURIComponent(next)}`}
          className="font-medium text-[#5b5bd6] hover:underline"
        >
          Sign in
        </Link>
      </p>
    </CandidateAuthLayout>
  );
}
