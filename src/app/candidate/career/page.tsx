'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { CandidateShell } from '@/components/layout/CandidateShell';
import { api } from '@/lib/api';

const ROLE_OPTIONS = ['technical', 'behavioral', 'sales', 'customer_success', 'engineering', 'product'];
const LOCATION_HINTS = ['Remote', 'New York', 'San Francisco', 'London', 'Berlin', 'Toronto', 'Hybrid'];

export default function CandidateCareerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [preferredRoles, setPreferredRoles] = useState<string[]>([]);
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [careerGoals, setCareerGoals] = useState('');
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false);
  const [locationInput, setLocationInput] = useState('');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('candidateToken') : null;
    if (!token) {
      router.replace('/candidate/login?next=/candidate/career');
      return;
    }
    api
      .candidateGetCareerPreferences()
      .then((res) => {
        setPreferredRoles(res.preferredRoles ?? []);
        setPreferredLocations(res.preferredLocations ?? []);
        setCareerGoals(res.careerGoals ?? '');
        setAutoApplyEnabled(res.autoApplyEnabled ?? false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load preferences');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const toggleRole = (role: string) => {
    setPreferredRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const addLocation = () => {
    const loc = locationInput.trim();
    if (!loc || preferredLocations.includes(loc)) return;
    setPreferredLocations((prev) => [...prev, loc]);
    setLocationInput('');
  };

  const removeLocation = (loc: string) => {
    setPreferredLocations((prev) => prev.filter((l) => l !== loc));
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await api.candidateUpdateCareerPreferences({
        preferredRoles,
        preferredLocations,
        careerGoals,
        autoApplyEnabled,
      });
      toast.success('Career preferences saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoApply = async () => {
    setError('');
    setApplying(true);
    try {
      const res = await api.candidateAutoApply();
      toast.success(`Applied to ${res.applied} new job(s). ${res.totalMatching} matching in total.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Auto-apply failed');
    } finally {
      setApplying(false);
    }
  };

  const segmentClass = (active: boolean) =>
    `rounded-lg px-3.5 py-2 text-sm font-medium transition ${
      active
        ? 'bg-[var(--surface-light-fg)] text-[var(--surface-light-card)]'
        : 'bg-[var(--accent-muted)] text-[var(--surface-light-muted)] hover:bg-[var(--accent-muted)]'
    }`;

  return (
    <CandidateShell
      title="Career"
      subtitle="Tell us what you’re looking for so we can match you better."
    >
      {loading && <p className="text-sm text-[var(--surface-light-muted)]">Loading…</p>}
      {error && (
        <p className="mb-4 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]">{error}</p>
      )}

      {!loading && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6">
            <h3 className="font-display text-base font-semibold text-[var(--surface-light-fg)]">Preferred roles</h3>
            <p className="mt-1 text-sm text-[var(--surface-light-muted)]">Select roles to match. Leave empty to match all.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={segmentClass(preferredRoles.includes(role))}
                >
                  {role.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6">
            <h3 className="font-display text-base font-semibold text-[var(--surface-light-fg)]">Preferred locations</h3>
            <p className="mt-1 text-sm text-[var(--surface-light-muted)]">Add locations (e.g. Remote). Leave empty to match all.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                placeholder="Add location"
                className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-2 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
              />
              <button
                type="button"
                onClick={addLocation}
                className="rounded-xl border border-[var(--surface-light-border)] px-4 py-2 text-sm font-semibold text-[var(--surface-light-fg)] hover:bg-[var(--surface-light)]"
              >
                Add
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {preferredLocations.map((loc) => (
                <span
                  key={loc}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-muted)] px-3 py-1.5 text-sm text-[var(--surface-light-fg)]"
                >
                  {loc}
                  <button type="button" onClick={() => removeLocation(loc)} className="text-[var(--surface-light-muted-soft)] hover:text-[var(--surface-light-fg)]" aria-label="Remove">
                    ×
                  </button>
                </span>
              ))}
              {LOCATION_HINTS.filter((l) => !preferredLocations.includes(l)).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setPreferredLocations((p) => [...p, loc])}
                  className="rounded-lg border border-dashed border-[var(--surface-light-border)] px-3 py-1.5 text-sm text-[var(--surface-light-muted)] hover:border-[var(--surface-light-muted)]"
                >
                  + {loc}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6">
            <h3 className="font-display text-base font-semibold text-[var(--surface-light-fg)]">Career goals</h3>
            <textarea
              value={careerGoals}
              onChange={(e) => setCareerGoals(e.target.value)}
              placeholder="Optional — a short note on what you’re aiming for"
              rows={3}
              className="mt-3 w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-sm text-[var(--surface-light-fg)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
          </section>

          <section className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={autoApplyEnabled}
                onChange={(e) => setAutoApplyEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--surface-light-border)]"
              />
              <span className="text-sm font-medium text-[var(--surface-light-fg)]">
                Remember auto-apply preference (use the button below to run it)
              </span>
            </label>
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-[var(--surface-light-fg)] px-5 py-2.5 text-sm font-semibold text-[var(--surface-light-card)] transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save preferences'}
            </button>
            <button
              type="button"
              onClick={handleAutoApply}
              disabled={applying}
              className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-5 py-2.5 text-sm font-semibold text-[var(--surface-light-fg)] transition hover:bg-[var(--surface-light)] disabled:opacity-60"
            >
              {applying ? 'Applying…' : 'Apply to matching jobs now'}
            </button>
          </div>
        </div>
      )}
    </CandidateShell>
  );
}
