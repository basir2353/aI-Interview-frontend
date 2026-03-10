'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type AdminQuestionRow } from '@/lib/api';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';

const ROLES = ['technical', 'behavioral', 'sales', 'customer_success'];
const PHASES = ['intro', 'technical', 'behavioral', 'wrap_up'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

export default function AdminQuestionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<AdminQuestionRow[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newQ, setNewQ] = useState({ role: 'technical', phase: 'technical', difficulty: 'medium', text: '', isCodingQuestion: false });

  const load = () =>
    api
      .adminGetQuestions({
        ...(roleFilter && { role: roleFilter }),
        ...(phaseFilter && { phase: phaseFilter }),
      })
      .then((r) => setQuestions(r.questions));

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    load()
      .catch(() => router.replace('/admin/login'))
      .finally(() => setLoading(false));
  }, [router, roleFilter, phaseFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question template?')) return;
    setActionLoadingId(id);
    try {
      await api.adminDeleteQuestion(id);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQ.text.trim()) return;
    setCreateLoading(true);
    try {
      await api.adminCreateQuestion({
        role: newQ.role,
        phase: newQ.phase,
        difficulty: newQ.difficulty,
        text: newQ.text.trim(),
        isCodingQuestion: newQ.isCodingQuestion,
      });
      setNewQ({ role: 'technical', phase: 'technical', difficulty: 'medium', text: '', isCodingQuestion: false });
      setShowAddForm(false);
      await load();
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-light)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)]/20 border-t-[var(--accent)]" />
          <p className="text-sm font-medium text-[var(--surface-light-muted)]">Loading question bank…</p>
        </div>
      </div>
    );
  }

  return (
    <AdminShell
      title="Question bank"
      description="Interview question templates by role and phase. Used by the AI during interviews."
    >
      <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-0 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--surface-light-border)] px-4 py-4 sm:gap-4 sm:px-6">
          <div>
            <h3 className="font-semibold text-[var(--surface-light-fg)]">Question templates</h3>
            <p className="mt-0.5 text-sm text-[var(--surface-light-muted)]">{questions.length} total</p>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-3 py-2 text-sm text-[var(--surface-light-fg)]"
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-3 py-2 text-sm text-[var(--surface-light-fg)]"
          >
            <option value="">All phases</option>
            {PHASES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="ml-auto rounded-xl border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {showAddForm ? 'Cancel' : 'Add question'}
          </button>
        </div>
        {showAddForm && (
          <form onSubmit={handleCreate} className="border-b border-[var(--surface-light-border)] bg-[var(--accent-muted)]/30 px-4 py-4 sm:px-6">
            <h4 className="mb-3 font-semibold text-[var(--surface-light-fg)]">New question template</h4>
            <div className="flex flex-wrap items-end gap-3 sm:gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--surface-light-muted)]">Role</span>
                <select
                  value={newQ.role}
                  onChange={(e) => setNewQ((q) => ({ ...q, role: e.target.value }))}
                  className="rounded-lg border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-3 py-2 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--surface-light-muted)]">Phase</span>
                <select
                  value={newQ.phase}
                  onChange={(e) => setNewQ((q) => ({ ...q, phase: e.target.value }))}
                  className="rounded-lg border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-3 py-2 text-sm"
                >
                  {PHASES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--surface-light-muted)]">Difficulty</span>
                <select
                  value={newQ.difficulty}
                  onChange={(e) => setNewQ((q) => ({ ...q, difficulty: e.target.value }))}
                  className="rounded-lg border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-3 py-2 text-sm"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-[200px]">
                <span className="text-xs text-[var(--surface-light-muted)]">Question text</span>
                <input
                  value={newQ.text}
                  onChange={(e) => setNewQ((q) => ({ ...q, text: e.target.value }))}
                  placeholder="e.g. Tell me about a time you led a project."
                  className="rounded-lg border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-3 py-2 text-sm"
                  required
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newQ.isCodingQuestion}
                  onChange={(e) => setNewQ((q) => ({ ...q, isCodingQuestion: e.target.checked }))}
                  className="h-4 w-4 rounded border-[var(--surface-light-border)]"
                />
                <span className="text-sm text-[var(--surface-light-fg)]">Coding question</span>
              </label>
              <button
                type="submit"
                disabled={createLoading || !newQ.text.trim()}
                className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {createLoading ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        )}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--surface-light-border)] bg-[var(--accent-muted)]">
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Role</th>
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Phase</th>
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Difficulty</th>
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Question</th>
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Coding</th>
                <th className="px-4 py-3 font-semibold text-[var(--surface-light-fg)] sm:px-6 sm:py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--surface-light-border)]">
              {questions.map((q) => (
                <tr key={q.id} className="hover:bg-[var(--accent-muted)]/40">
                  <td className="px-4 py-3 font-medium text-[var(--surface-light-fg)] sm:px-6 sm:py-4">{q.role}</td>
                  <td className="px-4 py-3 text-[var(--surface-light-fg)] sm:px-6 sm:py-4">{q.phase}</td>
                  <td className="px-4 py-3 text-[var(--surface-light-fg)] sm:px-6 sm:py-4">{q.difficulty}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-[var(--surface-light-fg)] sm:max-w-md sm:px-6 sm:py-4" title={q.text}>
                    {q.text}
                  </td>
                  <td className="px-4 py-3 text-[var(--surface-light-muted)] sm:px-6 sm:py-4">{q.is_coding_question ? 'Yes' : '—'}</td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4">
                    <button
                      type="button"
                      onClick={() => handleDelete(q.id)}
                      disabled={actionLoadingId === q.id}
                      className="rounded-full border border-[var(--error-border)] bg-[var(--error-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--error-text)] hover:opacity-90 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {questions.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-[var(--surface-light-muted)] sm:px-6">
            No questions match the filter. Use &quot;Add question&quot; to create templates.
          </div>
        )}
      </Card>
    </AdminShell>
  );
}
