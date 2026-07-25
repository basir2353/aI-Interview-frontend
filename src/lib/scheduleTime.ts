/**
 * Convert a date input (YYYY-MM-DD) + time input (HH:mm or HH:mm:ss)
 * into an ISO UTC string using the browser's local timezone.
 * Prefer numeric Date(...) over string parsing — avoids UTC/local ambiguity.
 */
export function localDateAndTimeToIso(date: string, time: string): string {
  const [y, m, d] = date.split('-').map((v) => Number(v));
  const parts = time.split(':').map((v) => Number(v));
  const hh = parts[0] ?? NaN;
  const mm = parts[1] ?? 0;
  const ss = parts[2] ?? 0;
  if (![y, m, d, hh, mm, ss].every((n) => Number.isFinite(n))) {
    throw new Error('Invalid date or time');
  }
  const local = new Date(y, m - 1, d, hh, mm, ss, 0);
  if (Number.isNaN(local.getTime())) {
    throw new Error('Invalid date or time');
  }
  return local.toISOString();
}

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Format ISO for UI lists with an explicit timezone abbreviation. */
export function formatScheduleDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}
