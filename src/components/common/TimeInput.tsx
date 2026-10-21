import React from 'react';

/**
 * Times in this app are IST wall-clock "HH:mm" strings. These helpers show and edit them the way people say
 * them (9:00 AM, 7:30 PM) without ever changing the stored value or converting any timezone.
 */
export const to12h = (hhmm?: string | null): string => {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm || '');
  if (!m) return hhmm || '—';
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
};

const sel = 'px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none disabled:opacity-40';
const pad = (n: number) => String(n).padStart(2, '0');

interface TimeInputProps {
  /** "HH:mm" (24-hour, IST) or '' for no time. */
  value: string;
  onChange: (next: string) => void;
  /** Adds a "—" hour so the time can be cleared. */
  allowEmpty?: boolean;
  ariaLabel: string;
}

/** Hour / minute / AM-PM pickers that read and write a 24-hour "HH:mm" IST string. */
export const TimeInput: React.FC<TimeInputProps> = ({ value, onChange, allowEmpty, ariaLabel }) => {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || '');
  const h24 = m ? Number(m[1]) : null;
  const minute = m ? Number(m[2]) : 0;
  const pm = h24 !== null && h24 >= 12;
  const hour12 = h24 === null ? '' : String(h24 % 12 || 12);

  const emit = (h12: number, min: number, isPm: boolean) => onChange(`${pad((h12 % 12) + (isPm ? 12 : 0))}:${pad(min)}`);

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={`${ariaLabel} (IST)`}>
      <select
        aria-label={`${ariaLabel} hour`}
        value={hour12}
        onChange={(e) => (e.target.value === '' ? onChange('') : emit(Number(e.target.value), minute, pm))}
        className={sel}
      >
        {(allowEmpty || h24 === null) && <option value="">—</option>}
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (<option key={h} value={h}>{h}</option>))}
      </select>
      <span className="text-slate-400">:</span>
      <select
        aria-label={`${ariaLabel} minute`}
        value={h24 === null ? '' : minute}
        disabled={h24 === null}
        onChange={(e) => emit(h24! % 12 || 12, Number(e.target.value), pm)}
        className={sel}
      >
        {h24 === null && <option value="">--</option>}
        {Array.from({ length: 60 }, (_, i) => i).map((n) => (<option key={n} value={n}>{pad(n)}</option>))}
      </select>
      <select
        aria-label={`${ariaLabel} AM or PM`}
        value={h24 === null ? '' : pm ? 'PM' : 'AM'}
        disabled={h24 === null}
        onChange={(e) => emit(h24! % 12 || 12, minute, e.target.value === 'PM')}
        className={sel}
      >
        {h24 === null && <option value="">--</option>}
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
};
