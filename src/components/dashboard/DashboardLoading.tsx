export function DashboardLoading({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-light)]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--accent)]" />
        <p className="text-sm text-[var(--surface-light-muted)]">{message}</p>
      </div>
    </div>
  );
}
