import React, { useState } from 'react';
import { AttendanceDay, TimesheetEmployee, EmployeePayrollSummary } from '../../types';
import { TableSkeleton } from '../common/TableSkeleton';
import { EmptyState } from '../common/EmptyState';
import { exportPayrollTimesheetCSV } from '../../lib/payrollExport';
import { EmployeeDrawer } from '../employees/EmployeeDrawer';
import { DayAdjustmentModal } from './DayAdjustmentModal';
import { LEGEND, STATUS_META, formatMinutes, metaFor } from '../../lib/attendanceDisplay';
import { formatBusinessDate } from '../../lib/businessDate';
import { Calendar, Clock, X, LogIn, LogOut, FileSpreadsheet } from 'lucide-react';

interface TimesheetMatrixProps {
  timesheets: TimesheetEmployee[];
  dates: string[]; // YYYY-MM-DD, every date of the range
  payrollSummaries?: Record<string, EmployeePayrollSummary>;
  isLoading: boolean;
  onSyncTrigger: () => void;
  dateRangeLabel?: string;
}

/**
 * DISPLAY ONLY. Each cell paints the backend's verdict for that employee and date, including weekly offs,
 * holidays, leave and absences. The totals are the backend's totals.
 */
export const TimesheetMatrix: React.FC<TimesheetMatrixProps> = ({
  timesheets, dates, payrollSummaries = {}, isLoading, onSyncTrigger, dateRangeLabel = 'Selected Range',
}) => {
  const [selectedDay, setSelectedDay] = useState<AttendanceDay | null>(null);
  const [drawerEmployee, setDrawerEmployee] = useState<TimesheetEmployee | null>(null);

  const handleExportPayroll = () => {
    if (timesheets.length === 0) return;
    exportPayrollTimesheetCSV(timesheets, dates, dateRangeLabel, payrollSummaries);
  };

  const renderCell = (day: AttendanceDay | undefined) => {
    if (!day) return <span className="text-slate-300 text-[10px]">-</span>;
    const meta = metaFor(day.status);
    return (
      <div
        onClick={() => setSelectedDay(day)}
        title={`${day.statusLabel || 'Upcoming'}${day.firstIn ? ` | In ${day.firstIn}` : ''}${day.lastOut ? `, Out ${day.lastOut}` : ''}`}
        className={`flex flex-col items-center justify-center p-1 rounded-lg border text-[10px] font-mono font-extrabold cursor-pointer hover:scale-105 transition-all shadow-xs ${meta.cell}`}
      >
        <span className="text-[11px] leading-tight">{day.inProgress ? 'IN' : meta.short}</span>
        {day.workMinutes > 0 && <span className="text-[9px] font-bold opacity-90">{formatMinutes(day.workMinutes)}</span>}
      </div>
    );
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 shadow-card overflow-hidden flex flex-col">
      <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-500" />
          <div>
            <h3 className="font-heading font-bold text-sm text-slate-900">Employee Work Hours Matrix (Timesheet)</h3>
            <p className="text-[11px] text-slate-500">One row per employee. Click a day to inspect it, or a name for the 360 view.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportPayroll}
            disabled={timesheets.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-heading font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50"
            title="Download the payroll attendance matrix as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Payroll CSV</span>
          </button>
          <div className="hidden lg:flex flex-wrap items-center gap-1.5 text-[10px] font-semibold pl-2 border-l border-slate-200">
            {LEGEND.map((st) => (
              <span key={st} className="flex items-center gap-1">
                <span className={`inline-block w-2 h-2 rounded-full border ${STATUS_META[st].cell}`} />
                {STATUS_META[st].short}
              </span>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={10} />
      ) : timesheets.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="No Employees for the Selected Filters"
            description="Add employees, sync attendance, or widen the filters to populate the timesheet."
            actionLabel="Sync Now"
            onAction={onSyncTrigger}
          />
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[650px] overflow-y-auto relative">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-30 text-[10px] text-slate-500 border-b border-slate-200 uppercase tracking-wider font-bold">
              <tr>
                <th className="p-3 sticky left-0 z-40 bg-white min-w-[140px] sm:min-w-[210px] shadow-md border-r border-slate-200">Employee (click for 360 view)</th>
                <th className="p-2.5 text-center min-w-[64px] bg-slate-50">Present</th>
                <th className="p-2.5 text-center min-w-[64px] bg-slate-50">Half</th>
                <th className="p-2.5 text-center min-w-[64px] bg-slate-50">Leave</th>
                <th className="p-2.5 text-center min-w-[64px] bg-slate-50">Absent</th>
                <th className="p-2.5 text-center min-w-[78px] bg-slate-50">Hours</th>
                {dates.map((d) => (
                  <th key={d} className="p-1.5 text-center min-w-[46px] font-mono bg-slate-50">
                    <div className="font-bold text-[11px] text-slate-800">{d.slice(8, 10)}</div>
                    <div className="text-[9px] text-slate-400 font-normal">{new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'UTC' })}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {timesheets.map((sheet) => (
                <tr key={sheet.employeeCode} className="hover:bg-slate-50/80 group">
                  <td
                    onClick={() => setDrawerEmployee(sheet)}
                    className="p-3 sticky left-0 z-20 bg-white shadow-md border-r border-slate-200 cursor-pointer hover:bg-sky-50/60 transition-colors"
                  >
                    <div className="font-bold text-slate-900 truncate max-w-[120px] sm:max-w-[190px] group-hover:text-brand-600 transition-colors">{sheet.employeeName}</div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-0.5">
                      <span className="text-brand-600 font-bold">{sheet.employeeCode}</span>
                      <span>•</span>
                      <span className="truncate">{sheet.siteName ?? '-'}</span>
                    </div>
                  </td>
                  <td className="p-2 text-center font-bold text-emerald-700 bg-emerald-50/50">{sheet.totals.presentDays}</td>
                  <td className="p-2 text-center font-bold text-amber-700 bg-amber-50/50">{sheet.totals.halfDays}</td>
                  <td className="p-2 text-center font-bold text-sky-700 bg-sky-50/50">{sheet.totals.leaveDays}</td>
                  <td className="p-2 text-center font-bold text-rose-700 bg-rose-50/50">{sheet.totals.absentDays}</td>
                  <td className="p-2 text-center font-mono font-bold text-brand-600">{formatMinutes(sheet.totals.workMinutes)}</td>
                  {dates.map((d) => (
                    <td key={d} className="p-1 text-center">{renderCell(sheet.days[d])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DayAdjustmentModal
        isOpen={Boolean(selectedDay)}
        onClose={() => setSelectedDay(null)}
        day={selectedDay}
      />

      <EmployeeDrawer
        isOpen={Boolean(drawerEmployee)}
        onClose={() => setDrawerEmployee(null)}
        employee={drawerEmployee ? { employeeCode: drawerEmployee.employeeCode, employeeName: drawerEmployee.employeeName, siteName: drawerEmployee.siteName ?? '-' } : null}
      />
    </div>
  );
};
