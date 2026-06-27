'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.submitContactForm({
        name,
        email,
        company: company || undefined,
        subject: subject || undefined,
        message,
      });
      toast.success(res.message || 'Message sent!');
      setName('');
      setEmail('');
      setCompany('');
      setSubject('');
      setMessage('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-[var(--landing-border)] bg-[var(--landing-surface)]/60 px-4 py-3 text-[var(--landing-text)] placeholder-[var(--landing-muted)] outline-none transition focus:border-[var(--landing-accent)] focus:ring-2 focus:ring-[var(--landing-accent)]/25';

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-xl space-y-4 text-left">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-[var(--landing-muted)]">
            Name *
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-[var(--landing-muted)]">
            Email *
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@company.com"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-company" className="mb-1.5 block text-sm font-medium text-[var(--landing-muted)]">
            Company
          </label>
          <input
            id="contact-company"
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className={inputClass}
            placeholder="Company name"
          />
        </div>
        <div>
          <label htmlFor="contact-subject" className="mb-1.5 block text-sm font-medium text-[var(--landing-muted)]">
            Subject
          </label>
          <input
            id="contact-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={inputClass}
            placeholder="Demo request"
          />
        </div>
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-[var(--landing-muted)]">
          Message *
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${inputClass} resize-y min-h-[120px]`}
          placeholder="Tell us about your hiring goals and roles…"
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full justify-center sm:w-auto">
        {loading ? 'Sending…' : 'Send message'}
      </Button>
    </form>
  );
}
