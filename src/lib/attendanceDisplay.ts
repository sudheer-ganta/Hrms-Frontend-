import type { AttendanceStatus } from '../types';

/**
 * DISPLAY ONLY. Maps the backend's canonical attendance status to a label and colours.
 * No attendance rule lives here: the backend resolver decides the status, the UI paints it.
 */
export interface StatusMeta {
  short: string;
  label: string;
  /** Tailwind classes for a pill / badge. */
  badge: string;
  /** Tailwind classes for a solid calendar cell. */
  cell: string;
  /** Counts as a day the employee is paid as worked (used only for legends). */
  paid: boolean;
}

export const STATUS_META: Record<AttendanceStatus, StatusMeta> = {
  PRESENT: { short: 'P', label: 'Present', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', cell: 'bg-emerald-500 border-emerald-600 text-white', paid: true },
  HALF_DAY: { short: '½', label: 'Half Day', badge: 'bg-amber-50 text-amber-700 border-amber-200', cell: 'bg-amber-400 border-amber-500 text-slate-950', paid: true },
  ABSENT: { short: 'A', label: 'Absent', badge: 'bg-rose-50 text-rose-700 border-rose-200', cell: 'bg-rose-500 border-rose-600 text-white', paid: false },
  WEEKLY_OFF: { short: 'WO', label: 'Weekly Off', badge: 'bg-slate-100 text-slate-600 border-slate-200', cell: 'bg-slate-100 border-slate-200 text-slate-500', paid: true },
  HOLIDAY: { short: 'HL', label: 'Holiday', badge: 'bg-purple-50 text-purple-700 border-purple-200', cell: 'bg-purple-600 border-purple-700 text-white', paid: true },
  LEAVE_PAID: { short: 'L', label: 'Paid Leave', badge: 'bg-sky-50 text-sky-700 border-sky-200', cell: 'bg-sky-500 border-sky-600 text-white', paid: true },
  LEAVE_UNPAID: { short: 'LWP', label: 'Unpaid Leave', badge: 'bg-rose-50 text-rose-700 border-rose-200', cell: 'bg-rose-400 border-rose-500 text-white', paid: false },
  WORK_FROM_HOME: { short: 'WFH', label: 'Work From Home', badge: 'bg-teal-50 text-teal-700 border-teal-200', cell: 'bg-teal-500 border-teal-600 text-white', paid: true },
  ON_DUTY: { short: 'OD', label: 'On Duty', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', cell: 'bg-indigo-500 border-indigo-600 text-white', paid: true },
  MISSED_PUNCH: { short: 'MP', label: 'Missed Punch', badge: 'bg-orange-50 text-orange-700 border-orange-200', cell: 'bg-orange-400 border-orange-500 text-slate-950', paid: true },
};

export const FUTURE_META: StatusMeta = {
  short: '', label: 'Upcoming', badge: 'bg-slate-50 text-slate-400 border-slate-200', cell: 'bg-slate-50 border-slate-200 text-slate-400', paid: false,
};

export const metaFor = (status: AttendanceStatus | null | undefined): StatusMeta => (status ? STATUS_META[status] : FUTURE_META);

/** Legend order shown under calendars. */
export const LEGEND: AttendanceStatus[] = ['PRESENT', 'HALF_DAY', 'ABSENT', 'LEAVE_PAID', 'WORK_FROM_HOME', 'ON_DUTY', 'MISSED_PUNCH', 'HOLIDAY', 'WEEKLY_OFF'];

export const formatMinutes = (minutes: number | null | undefined): string => {
  if (!minutes || minutes <= 0) return '00:00';
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

export const formatTimeOrDash = (t: string | null | undefined): string => (t ? t : '--:--');
