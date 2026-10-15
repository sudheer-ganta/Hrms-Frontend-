import React, { useState } from 'react';
import type { AttendanceDay } from '../../types';
import { LEGEND, STATUS_META, formatMinutes, metaFor } from '../../lib/attendanceDisplay';
import { istToday, weekdayIndexMonFirst } from '../../lib/businessDate';
import { DayAdjustmentModal } from './DayAdjustmentModal';

interface AttendanceCalendarProps {
  /** Every date of the month, resolved by the backend (GET /attendance/calendar). */
  days: AttendanceDay[];
  onSelectDay?: (day: AttendanceDay) => void;
  showLegend?: boolean;
}

/**
 * DISPLAY ONLY. Paints the backend's per-day verdict. Which days are weekly offs, holidays, leave or
 * absent is decided by the backend resolver, so this grid always matches the admin screens and payroll.
 * Clicking any day opens the action/adjustment modal allowing WFH, Leave, Missed Punch or OD override.
 */
export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ days, onSelectDay, showLegend = true }) => {
  const [modalDay, setModalDay] = useState<AttendanceDay | null>(null);

  if (days.length === 0) return <p className="text-xs text-slate-500">No calendar data.</p>;
  const lead = weekdayIndexMonFirst(days[0].businessDate);
  const today = istToday();

  const handleDayClick = (d: AttendanceDay) => {
    if (onSelectDay) {
      onSelectDay(d);
    } else {
      setModalDay(d);
    }
  };

  return (
    <>
      <div className="space-y-3">
        {showLegend && (
          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            {LEGEND.map((st) => (
              <span key={st} className="flex items-center gap-1.5">
                <span className={`inline-block w-2.5 h-2.5 rounded-full border ${STATUS_META[st].cell}`} />
                {STATUS_META[st].label}
              </span>
            ))}
          </div>
        )}
        <div className="grid grid-cols-7 gap-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="text-center text-[11px] font-extrabold text-slate-400 uppercase py-1">{d}</div>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <div key={`pad-${i}`} className="h-10 sm:h-12 rounded-xl bg-slate-50/40 border border-transparent" />
          ))}
          {days.map((d) => {
            const meta = metaFor(d.status);
            const isClickable = d.status !== null;
            const title = d.status
              ? `${d.businessDate}: ${d.statusLabel}${d.firstIn ? ` | In ${d.firstIn}` : ''}${d.lastOut ? `, Out ${d.lastOut}` : ''}${d.workMinutes ? ` | ${formatMinutes(d.workMinutes)}h` : ''}${d.isLate ? ' | Late' : ''}${d.manualOverride ? ' | Approved request' : ''} (Click to regularize / change to WFH)`
              : `${d.businessDate}: upcoming`;
            return (
              <button
                key={d.businessDate}
                type="button"
                onClick={() => handleDayClick(d)}
                title={title}
                className={`h-10 sm:h-12 rounded-xl border flex flex-col items-center justify-center p-1 text-xs transition-all font-bold ${meta.cell} ${
                  d.businessDate === today ? 'ring-2 ring-[#1184b0] ring-offset-1' : ''
                } ${isClickable ? 'cursor-pointer hover:scale-105 hover:shadow-md' : 'cursor-default'}`}
              >
                <span className="font-extrabold text-[13px] leading-none">{Number(d.businessDate.slice(8, 10))}</span>
                <span className="text-[9px] opacity-90 uppercase tracking-wider leading-none mt-0.5">{d.inProgress ? 'IN' : meta.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      <DayAdjustmentModal
        isOpen={Boolean(modalDay)}
        onClose={() => setModalDay(null)}
        day={modalDay}
      />
    </>
  );
};

