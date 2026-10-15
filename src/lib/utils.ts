import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "09:05" style minutes → "HH:MM" (formatting only). */
export function formatMinutesToHours(minutes: number): string {
  const m = Math.max(0, Math.round(minutes || 0));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Indian-style currency formatting (display only). */
export const inr = (n: number | null | undefined): string => `₹${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/**
 * Translates raw vendor/network error text into plain language so sync failures are actionable.
 */
export function humanizeSyncError(message?: string | null): string {
  if (!message) return "Something went wrong and we're not sure why. Please try again.";
  if (/timeout|ETIMEDOUT|ECONNABORTED/i.test(message)) {
    return "Couldn't reach the biometric device in time (the connection timed out). This is usually temporary; it is retried automatically on the next sync.";
  }
  if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|reach e-Timeoffice host|network/i.test(message)) {
    return "Couldn't reach e-Timeoffice's servers. Check the internet connection and try again.";
  }
  if (/Authentication failed|401/i.test(message)) {
    return 'The saved login details for this location were rejected. Ask an admin to double-check the Corporate ID, username and password.';
  }
  if (/credentials.*missing|missing or incomplete/i.test(message)) {
    return "This location isn't fully set up yet: login details are missing. Ask an admin to add them to the server configuration.";
  }
  if (/500|remote server error/i.test(message)) {
    return "e-Timeoffice's own servers had a problem on their end. Please retry in a few minutes.";
  }
  return message;
}
