import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string | Date): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(dateString);
  }
}

export function formatTime(timeString?: string): string {
  if (!timeString) return '-';
  return timeString;
}

export function formatDateTime(dateString?: string | Date): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return String(dateString);
  }
}

export function formatMinutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Computes the values needed to render "this month" as a Mon-Sun calendar grid,
 * so calendar matrices reflect the real current month instead of a fixed date.
 */
export function getCurrentMonthCalendarInfo() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const monthName = today.toLocaleDateString('en-US', { month: 'long' });
  const todayISO = today.toISOString().split('T')[0];
  // Grid week starts Monday; JS getDay() is 0=Sun..6=Sat, so shift it to 0=Mon..6=Sun.
  const leadingPadding = (new Date(year, month, 1).getDay() + 6) % 7;
  const buildDateStr = (dayNum: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

  return { year, month, daysInMonth, monthLabel, monthName, todayISO, leadingPadding, buildDateStr };
}

/**
 * Translates raw vendor/network error text into a plain-language explanation
 * a non-technical reader can act on, so sync failures aren't just a stack trace.
 */
export function humanizeSyncError(message?: string | null): string {
  if (!message) return 'Something went wrong and we\'re not sure why. Please try again.';

  if (/timeout|ETIMEDOUT|ECONNABORTED/i.test(message)) {
    return "Couldn't reach the biometric device in time (the connection timed out). This is usually temporary — it will be retried automatically on the next sync.";
  }
  if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|reach e-Timeoffice host|network/i.test(message)) {
    return "Couldn't reach e-Timeoffice's servers. Check the internet connection and try again.";
  }
  if (/Authentication failed|401/i.test(message)) {
    return 'The saved login details for this location were rejected. Ask an admin to double-check the Corporate ID, username and password in Settings.';
  }
  if (/credentials.*missing|missing or incomplete/i.test(message)) {
    return "This location isn't fully set up yet — login details are missing. Ask an admin to add them in Settings.";
  }
  if (/500|remote server error/i.test(message)) {
    return "e-Timeoffice's own servers had a problem on their end. Please retry in a few minutes.";
  }

  return message;
}
