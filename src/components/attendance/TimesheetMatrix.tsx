import React, { useState } from 'react';
import { EmployeeTimesheet, EmployeePayrollSummary } from '../../types';
import { TableSkeleton } from '../common/TableSkeleton';
import { EmptyState } from '../common/EmptyState';
import { exportPayrollTimesheetCSV } from '../../lib/payrollExport';
import { EmployeeDrawer } from '../employees/EmployeeDrawer';
import { 
  Calendar, 
  Clock, 
  X,
  LogIn,
  LogOut,
  Timer,
  Download,
  FileSpreadsheet,
  User
} from 'lucide-react';

interface TimesheetMatrixProps {
  timesheets: EmployeeTimesheet[];
  dates: string[]; // List of YYYY-MM-DD
  payrollSummaries?: Record<string, EmployeePayrollSummary>;
  isLoading: boolean;
  onSyncTrigger: () => void;
  dateRangeLabel?: string;
}

export const TimesheetMatrix: React.FC<TimesheetMatrixProps> = ({
  timesheets,
  dates,
  payrollSummaries = {},
  isLoading,
  onSyncTrigger,
  dateRangeLabel = 'Current Month',
}) => {
  const [selectedDayDetail, setSelectedDayDetail] = useState<{
    employeeName: string;
    employeeCode: string;
    sourceName: string;
    date: string;
    dayData?: any;
  } | null>(null);

  const [selectedEmployeeForDrawer, setSelectedEmployeeForDrawer] = useState<EmployeeTimesheet | null>(null);

  const handleExportPayroll = () => {
    if (timesheets.length === 0) return;
    exportPayrollTimesheetCSV(timesheets, dates, dateRangeLabel, payrollSummaries);
  };

  const getDayStatusCell = (
    dayData: any,
    dateStr: string,
    employeeName: string,
    employeeCode: string,
    sourceName: string
  ) => {
    const isSunday = new Date(dateStr).getDay() === 0;

    if (!dayData) {
      if (isSunday) {
        return (
          <div
            onClick={() =>
              setSelectedDayDetail({ employeeName, employeeCode, sourceName, date: dateStr, dayData })
            }
            className="flex items-center justify-center p-1 rounded-lg bg-slate-100 text-[10px] text-slate-500 font-mono font-medium cursor-pointer hover:bg-slate-200 transition-colors"
            title="Sunday (Weekly Off)"
          >
            WO
          </div>
        );
      }
      return <span className="text-slate-300 text-[10px]">-</span>;
    }

    const { status, workTime, inTime, outTime } = dayData;
    const s = (status || '').toUpperCase();
    const hasIn = Boolean(inTime && inTime !== '--:--');
    const hasOut = Boolean(outTime && outTime !== '--:--');
    // Marked absent by the vendor but exactly one punch was recorded — the employee
    // was physically here, they (or the device) just missed a swipe. That's a very
    // different situation from a genuine no-show and deserves its own look, not red.
    const isForgotSwipe = s === 'A' && hasIn !== hasOut;

    let cellContent = null;

    if (isForgotSwipe) {
      cellContent = (
        <div
          className="flex items-center justify-center p-1 rounded-lg bg-orange-100 text-[10px] text-orange-800 font-mono font-extrabold hover:scale-105 hover:bg-orange-200 transition-all cursor-pointer border border-orange-200 shadow-xs"
          title={`Forgot Swipe — only ${hasIn ? 'check-in' : 'check-out'} recorded (In: ${inTime}, Out: ${outTime})`}
        >
          FS
        </div>
      );
    } else if (s === 'P') {
      cellContent = (
        <div
          className="flex flex-col items-center justify-center p-1 rounded-lg bg-emerald-100 text-[10px] text-emerald-800 font-mono hover:scale-105 hover:bg-emerald-200 transition-all cursor-pointer border border-emerald-200 shadow-xs"
          title={`Click to view: In: ${inTime}, Out: ${outTime}, Work: ${workTime}`}
        >
          <span className="font-extrabold text-[11px] leading-tight text-emerald-900">P</span>
          <span className="text-[9px] font-bold text-emerald-700">{workTime !== '00:00' ? workTime : 'In'}</span>
        </div>
      );
    } else if (s === 'P/2') {
      cellContent = (
        <div
          className="flex flex-col items-center justify-center p-1 rounded-lg bg-amber-100 text-[10px] text-amber-800 font-mono hover:scale-105 hover:bg-amber-200 transition-all cursor-pointer border border-amber-200 shadow-xs"
          title={`Half Day: ${workTime}`}
        >
          <span className="font-extrabold text-[11px] leading-tight text-amber-900">½</span>
          <span className="text-[9px] font-bold text-amber-700">{workTime}</span>
        </div>
      );
    } else if (s === 'A') {
      if (isSunday && inTime === '--:--' && outTime === '--:--') {
        cellContent = (
          <div
            className="flex items-center justify-center p-1 rounded-lg bg-slate-100 text-[10px] text-slate-500 font-mono cursor-pointer hover:bg-slate-200 transition-colors"
            title="Sunday (Weekly Off)"
          >
            WO
          </div>
        );
      } else {
        cellContent = (
          <div
            className="flex items-center justify-center p-1 rounded-lg bg-rose-100 text-[10px] text-rose-800 font-mono font-extrabold hover:scale-105 hover:bg-rose-200 transition-all cursor-pointer border border-rose-200 shadow-xs"
            title={`Absent (In: ${inTime}, Out: ${outTime})`}
          >
            A
          </div>
        );
      }
    } else if (s === 'W' || s === 'WO') {
      cellContent = (
        <div
          className="flex items-center justify-center p-1 rounded-lg bg-slate-100 text-[10px] text-slate-500 font-mono cursor-pointer"
          title="Weekly Off"
        >
          WO
        </div>
      );
    } else {
      cellContent = (
        <div className="flex items-center justify-center p-1 rounded-lg bg-slate-100 text-[10px] text-slate-700 cursor-pointer">
          {status}
        </div>
      );
    }

    return (
      <div
        onClick={() =>
          setSelectedDayDetail({ employeeName, employeeCode, sourceName, date: dateStr, dayData })
        }
      >
        {cellContent}
      </div>
    );
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 shadow-card overflow-hidden flex flex-col">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-500" />
          <div>
            <h3 className="font-heading font-bold text-sm text-slate-900">Employee Work Hours Matrix (Timesheet)</h3>
            <p className="text-[11px] text-slate-500">Click any day badge to inspect punch details & hours</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportPayroll}
            disabled={timesheets.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-heading font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50"
            title="Download full payroll attendance matrix as CSV/Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Payroll CSV</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold pl-2 border-l border-slate-200">
            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> P
            </span>
            <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> ½
            </span>
            <span className="flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> A
            </span>
            <span className="flex items-center gap-1 text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md text-[11px]" title="Only one of check-in/check-out was recorded">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> FS
            </span>
            <span className="flex items-center gap-1 text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> WO
            </span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={10} />
      ) : timesheets.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="No Timesheet Data for Selected Range"
            description="Sync attendance data for this date range to populate the timesheet matrix."
            actionLabel="Sync Now"
            onAction={onSyncTrigger}
          />
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[650px] overflow-y-auto relative">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-30 text-[10px] text-slate-500 border-b border-slate-200 uppercase tracking-wider font-bold">
              <tr>
                {/* Fixed Opaque Sticky Employee Column */}
                <th className="p-3 sticky left-0 z-40 bg-white min-w-[140px] sm:min-w-[210px] shadow-md border-r border-slate-200">
                  Employee (Click for 360 View)
                </th>
                <th className="p-2.5 text-center min-w-[70px] bg-slate-50">
                  Present
                </th>
                <th className="p-2.5 text-center min-w-[70px] bg-slate-50">
                  Absent
                </th>
                <th className="p-2.5 text-center min-w-[85px] bg-slate-50">
                  Avg Hrs
                </th>
                {dates.map((d) => {
                  const dayNum = d.split('-')[2];
                  const dateObj = new Date(d);
                  const isSun = dateObj.getDay() === 0;
                  const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'narrow' });
                  return (
                    <th
                      key={d}
                      className={`p-1.5 text-center min-w-[46px] font-mono ${
                        isSun ? 'bg-amber-50/70 text-amber-700' : 'bg-slate-50'
                      }`}
                    >
                      <div className={`font-bold text-[11px] ${isSun ? 'text-amber-700' : 'text-slate-800'}`}>
                        {dayNum}
                      </div>
                      <div className="text-[9px] text-slate-400 font-normal">{weekday}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {timesheets.map((sheet, idx) => (
                <tr key={`${sheet.sourceId}_${sheet.employeeCode}_${idx}`} className="hover:bg-slate-50/80 group">
                  {/* Fixed Opaque Sticky Employee Cell with click to open drawer */}
                  <td 
                    onClick={() => setSelectedEmployeeForDrawer(sheet)}
                    className="p-3 sticky left-0 z-20 bg-white shadow-md border-r border-slate-200 cursor-pointer hover:bg-sky-50/60 transition-colors"
                  >
                    <div className="font-bold text-slate-900 truncate max-w-[120px] sm:max-w-[190px] group-hover:text-brand-600 transition-colors flex items-center justify-between">
                      <span>{sheet.employeeName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-0.5">
                      <span className="text-brand-600 font-bold">{sheet.employeeCode}</span>
                      <span>•</span>
                      <span className="truncate">{sheet.sourceName}</span>
                    </div>
                  </td>
                  <td className="p-2 text-center font-bold text-emerald-700 bg-emerald-50/50">
                    {sheet.totalDaysPresent}
                  </td>
                  <td className="p-2 text-center font-bold text-rose-700 bg-rose-50/50">
                    {sheet.totalDaysAbsent}
                  </td>
                  <td className="p-2 text-center font-mono font-bold text-brand-600">
                    {sheet.avgHoursPerDay}
                  </td>
                  {dates.map((d) => (
                    <td key={d} className="p-1 text-center">
                      {getDayStatusCell(sheet.days[d], d, sheet.employeeName, sheet.employeeCode, sheet.sourceName)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Day Detail Popover Modal */}
      {selectedDayDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-500" />
                <h3 className="font-heading font-bold text-slate-900 text-sm">Attendance Day Details</h3>
              </div>
              <button
                onClick={() => setSelectedDayDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-900 text-sm">{selectedDayDetail.employeeName}</div>
                <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                  <span className="text-brand-600 font-bold">Code: {selectedDayDetail.employeeCode}</span>
                  <span>•</span>
                  <span>{selectedDayDetail.sourceName}</span>
                </div>
                <div className="text-slate-600 font-mono pt-1 text-xs font-semibold">Date: {selectedDayDetail.date}</div>
              </div>

              {selectedDayDetail.dayData ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <LogIn className="w-3.5 h-3.5 text-emerald-600" /> Check-In Time
                      </span>
                      <span className="text-base font-mono font-bold text-emerald-700 mt-1 block">
                        {selectedDayDetail.dayData.inTime || '--:--'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <LogOut className="w-3.5 h-3.5 text-cyan-600" /> Check-Out Time
                      </span>
                      <span className="text-base font-mono font-bold text-cyan-700 mt-1 block">
                        {selectedDayDetail.dayData.outTime || '--:--'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-brand-500" /> Total Work Hours
                      </span>
                      <span className="text-base font-mono font-bold text-slate-900 mt-1 block">
                        {selectedDayDetail.dayData.workTime || '00:00'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                        Late Arrival
                      </span>
                      <span className="text-sm font-mono font-bold text-amber-700 mt-1 block">
                        {selectedDayDetail.dayData.lateIn && selectedDayDetail.dayData.lateIn !== '00:00'
                          ? `+${selectedDayDetail.dayData.lateIn}`
                          : 'On Time (00:00)'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Status:</span>
                    {(() => {
                      const d = selectedDayDetail.dayData;
                      const hasIn = Boolean(d.inTime && d.inTime !== '--:--');
                      const hasOut = Boolean(d.outTime && d.outTime !== '--:--');
                      const isForgotSwipe = d.status === 'A' && hasIn !== hasOut;
                      if (isForgotSwipe) {
                        return (
                          <span className="font-bold text-orange-600 uppercase">
                            Forgot Swipe — only {hasIn ? 'check-in' : 'check-out'} recorded
                          </span>
                        );
                      }
                      return (
                        <span className="font-bold text-brand-600 uppercase">
                          {d.status === 'P'
                            ? 'Present'
                            : d.status === 'P/2'
                            ? 'Half Day'
                            : d.status === 'A'
                            ? 'Absent'
                            : d.status}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 font-medium">
                  No swipe punches registered for this date.
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedDayDetail(null)}
                className="px-4 py-2 text-xs font-heading font-bold text-white bg-gradient-to-r from-brand-500 to-brand-base hover:opacity-95 rounded-xl shadow-md shadow-brand-500/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee 360 Profile Drawer */}
      <EmployeeDrawer
        isOpen={Boolean(selectedEmployeeForDrawer)}
        onClose={() => setSelectedEmployeeForDrawer(null)}
        employee={selectedEmployeeForDrawer ? {
          employeeCode: selectedEmployeeForDrawer.employeeCode,
          employeeName: selectedEmployeeForDrawer.employeeName,
          sourceName: selectedEmployeeForDrawer.sourceName,
          sourceId: selectedEmployeeForDrawer.sourceId,
        } : null}
        timesheet={selectedEmployeeForDrawer}
      />
    </div>
  );
};

