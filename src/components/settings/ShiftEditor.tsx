import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ShiftConfig, TimeWindow } from '../../types';
import { TimeInput, to12h } from '../common/TimeInput';

const input = 'w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none';
const label = 'block text-xs font-bold text-slate-700 font-heading mb-1.5';

/** The overtime hours of one shift. Only time punched inside these windows is overtime. All times are IST. */
const OtWindowsEditor: React.FC<{ windows: TimeWindow[]; onChange: (next: TimeWindow[]) => void }> = ({ windows, onChange }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <label className={label + ' mb-0'}>Overtime hours</label>
      <button
        type="button"
        disabled={windows.length >= 6}
        onClick={() => onChange([...windows, { start: '19:00', end: '21:00' }])}
        className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 disabled:opacity-40"
      >
        <Plus className="w-3.5 h-3.5" /> Add overtime time
      </button>
    </div>
    {windows.length === 0 && <p className="text-[10px] text-slate-400">No overtime time added, so this shift gets no overtime.</p>}
    {windows.map((w, i) => (
      <div key={i} className="flex flex-wrap items-center gap-2">
        <TimeInput value={w.start} onChange={(v) => onChange(windows.map((x, j) => (j === i ? { ...x, start: v } : x)))} ariaLabel={`Overtime ${i + 1} from`} />
        <span className="text-xs text-slate-400">to</span>
        <TimeInput value={w.end} onChange={(v) => onChange(windows.map((x, j) => (j === i ? { ...x, end: v } : x)))} ariaLabel={`Overtime ${i + 1} to`} />
        <button type="button" onClick={() => onChange(windows.filter((_, j) => j !== i))} className="p-2 text-slate-400 hover:text-red-500" aria-label="Remove overtime hours">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    ))}
    {windows.length > 0 && (
      <p className="text-[10px] text-slate-400">
        Example: overtime from 7:00 PM to 9:00 PM. Someone who leaves at 8:30 PM gets 1 hour 30 minutes. Time outside these hours (like a tea break) is never overtime. For no limit, end at 11:59 PM.
      </p>
    )}
  </div>
);

/** One shift: working hours, attendance limits and overtime hours. The default shift cannot be removed. */
export const ShiftFields: React.FC<{
  shift: ShiftConfig;
  onChange: (next: ShiftConfig) => void;
  onRemove?: () => void;
  isDefault?: boolean;
  lateAfter?: string;
}> = ({ shift, onChange, onRemove, isDefault, lateAfter }) => {
  const set = (patch: Partial<ShiftConfig>) => onChange({ ...shift, ...patch });
  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className={label}>
            Name of shift {isDefault && <span className="ml-1 text-[10px] font-semibold text-slate-400">Everyone follows this unless given another shift</span>}
          </label>
          <input type="text" value={shift.shiftName} onChange={(e) => set({ shiftName: e.target.value })} className={input} placeholder="e.g. Budigere Day" />
        </div>
        {onRemove && (
          <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50">
            <Trash2 className="w-4 h-4" /> Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className={label}>Work starts at</label>
          <TimeInput value={shift.startTime} onChange={(v) => set({ startTime: v })} ariaLabel="Shift start" />
        </div>
        <div>
          <label className={label}>Work ends at</label>
          <TimeInput value={shift.endTime} onChange={(v) => set({ endTime: v })} ariaLabel="Shift end" />
        </div>
        <div>
          <label className={label}>Extra minutes allowed to come late</label>
          <input type="number" min="0" max="600" value={shift.gracePeriodMinutes} onChange={(e) => set({ gracePeriodMinutes: Number(e.target.value) })} className={input} />
          {isDefault && lateAfter && <span className="text-[10px] text-slate-400 mt-1 block">Coming after {to12h(lateAfter)} is marked Late</span>}
        </div>
        <div>
          <label className={label}>Half day if worked at least (minutes)</label>
          <input type="number" min="1" value={shift.halfDayThresholdMinutes} onChange={(e) => set({ halfDayThresholdMinutes: Number(e.target.value) })} className={input} />
        </div>
        <div>
          <label className={label}>Full day if worked at least (minutes)</label>
          <input type="number" min="1" value={shift.fullDayThresholdMinutes} onChange={(e) => set({ fullDayThresholdMinutes: Number(e.target.value) })} className={input} />
        </div>
        <div>
          <label className={label}>Also full day if leaving at or after (optional)</label>
          <TimeInput allowEmpty value={shift.minCheckoutForFullDay || ''} onChange={(v) => set({ minCheckoutForFullDay: v })} ariaLabel="Full day if punch out is at or after" />
          <span className="text-[10px] text-slate-400 mt-1 block">Leaving at or after this time counts as a full day, if the half day minutes are also done.</span>
        </div>
      </div>

      <OtWindowsEditor windows={shift.otWindows} onChange={(otWindows) => set({ otWindows })} />
    </div>
  );
};
