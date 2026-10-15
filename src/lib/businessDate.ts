/**
 * HRMS time contract (identical to the backend):
 *  - business dates are "YYYY-MM-DD" in Asia/Kolkata
 *  - business months are "YYYY-MM" in Asia/Kolkata
 * Never derive a business date from `new Date().toISOString()` (that is UTC) or from the browser's
 * local timezone: between 00:00 and 05:30 IST it would be yesterday.
 */
const IST_OFFSET_MS = 330 * 60_000;
const pad = (n: number) => String(n).padStart(2, '0');

const istParts = (instant: Date) => {
  const s = new Date(instant.getTime() + IST_OFFSET_MS);
  return { y: s.getUTCFullYear(), m: s.getUTCMonth() + 1, d: s.getUTCDate() };
};

export const businessDateFromInstant = (instant: Date): string => {
  const p = istParts(instant);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
};

export const istToday = (now: Date = new Date()): string => businessDateFromInstant(now);
export const istMonth = (now: Date = new Date()): string => istToday(now).slice(0, 7);

export const addDays = (businessDate: string, days: number): string => {
  const [y, m, d] = businessDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
};

export const daysInMonth = (month: string): string[] => {
  const [y, m] = month.split('-').map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${month}-${pad(i + 1)}`);
};

export const datesBetween = (from: string, to: string): string[] => {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
};

/** 0 = Monday … 6 = Sunday (calendar grids start on Monday). */
export const weekdayIndexMonFirst = (businessDate: string): number => {
  const [y, m, d] = businessDate.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
};

export const addMonths = (month: string, delta: number): string => {
  const [y, m] = month.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}`;
};

/** "08 Oct 2026" from a business date, independent of browser timezone. */
export const formatBusinessDate = (businessDate?: string | null): string => {
  if (!businessDate) return '-';
  const [y, m, d] = businessDate.split('-').map(Number);
  if (!y || !m || !d) return businessDate;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

export const formatBusinessDay = (businessDate: string): string => {
  const [y, m, d] = businessDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' });
};

export const monthLabel = (month: string): string => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

/** Wall-clock display of an instant in IST ("08 Oct 2026, 09:15"). */
export const formatInstantIst = (iso?: string | Date | null): string => {
  if (!iso) return '-';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
};

export const formatInstantTimeIst = (iso?: string | Date | null): string => {
  if (!iso) return '-';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
};

export const monthOptions = (count = 12, from: string = istMonth()): string[] =>
  Array.from({ length: count }, (_, i) => addMonths(from, -i));
