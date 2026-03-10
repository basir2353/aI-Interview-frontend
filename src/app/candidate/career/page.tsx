'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { CandidateSubnav } from '@/components/layout/CandidateSubnav';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

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
        preferredRoles: preferredRoles,
        preferredLocations: preferredLocations,
        careerGoals: careerGoals,
        autoApplyEnabled: autoApplyEnabled,
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

  return (
    <AppShell
      title="Career"
      subtitle="Set your preferences and apply to matching jobs"
      backHref="/candidate/dashboard"
      backLabel="Dashboard"
      theme="light"
    >
      <div className="space-y-6">
        <CandidateSubnav />
        {loading && <p className="text-sm text-[var(--surface-light-muted)]">Loading…</p>}
        {error && (
          <p className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]">
            {error}
          </p>
        )}

        {!loading && (
          <>
            <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6">
              <h3 className="text-lg font-semibold text-[var(--surface-light-fg)]">Preferred roles</h3>
              <p className="mt-1 text-sm text-[var(--surface-light-muted)]">
                Select roles you want to be matched with. Leave empty to match all.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                      preferredRoles.includes(role)
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--surface-light-input)] text-[var(--surface-light-fg)] hover:bg-[var(--accent-muted)]'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </Card>

            <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6">
              <h3 className="text-lg font-semibold text-[var(--surface-light-fg)]">Preferred locations</h3>
              <p className="mt-1 text-sm text-[var(--surface-light-muted)]">
                Add locations (e.g. Remote, City name). Leave empty to match all.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                  placeholder="Add location"
                  className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-2 text-sm text-[var(--surface-light-fg)]"
                />
                <Button size="md" variant="secondary" onClick={addLocation}>
                  Add
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {preferredLocations.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1 rounded-xl bg-[var(--accent-muted)] px-3 py-1.5 text-sm text-[var(--accent)]"
                  >
                    {loc}
                    <button type="button" onClick={() => removeLocation(loc)} className="hover:opacity-80" aria-label="Remove">
                      ×
                    </button>
                  </span>
                ))}
                {LOCATION_HINTS.filter((l) => !preferredLocations.includes(l)).map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setPreferredLocations((p) => [...p, loc])}
                    className="rounded-xl border border-[var(--surface-light-border)] px-3 py-1.5 text-sm text-[var(--surface-light-muted)] hover:bg-[var(--surface-light-input)]"
                  >
                    + {loc}
                  </button>
                ))}
              </div>
            </Card>

            <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6">
              <h3 className="text-lg font-semibold text-[var(--surface-light-fg)]">Career goals</h3>
              <textarea
                value={careerGoals}
                onChange={(e) => setCareerGoals(e.target.value)}
                placeholder="Short description of your career goals (optional)"
                rows={3}
                className="mt-2 w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-sm text-[var(--surface-light-fg)]"
              />
            </Card>

            <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-6">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={autoApplyEnabled}
                  onChange={(e) => setAutoApplyEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--surface-light-border)]"
                />
                <span className="text-sm font-medium text-[var(--surface-light-fg)]">
                  Save “auto-apply” preference (use the button below to run it)
                </span>
              </label>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save preferences'}
              </Button>
              <Button variant="secondary" onClick={handleAutoApply} disabled={applying}>
                {applying ? 'Applying…' : 'Apply to matching jobs now'}
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
