import React, { useState } from 'react';
import { AttendanceDay, Pagination } from '../../types';
import { metaFor } from '../../lib/attendanceDisplay';
import { formatBusinessDate } from '../../lib/businessDate';
import { TableSkeleton } from '../common/TableSkeleton';
import { EmptyState } from '../common/EmptyState';
import { DayAdjustmentModal } from './DayAdjustmentModal';
import { 
  Building2, 
  LogIn, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight 
} from 'lucide-react';

interface DailyAttendanceTableProps {
  records: AttendanceDay[];
  pagination: Pagination;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  onSyncTrigger: () => void;
}

export const DailyAttendanceTable: React.FC<DailyAttendanceTableProps> = ({
  records,
  pagination,
  isLoading,
  onPageChange,
  onLimitChange,
  onSyncTrigger,
}) => {
  const [selectedDay, setSelectedDay] = useState<AttendanceDay | null>(null);
  const { page, limit, total, totalPages } = pagination;

  const getStatusBadge = (r: AttendanceDay) => {
    const meta = metaFor(r.status);
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${meta.badge}`}>
        {r.inProgress ? 'Checked in' : meta.label}
      </span>
    );
  };

  const getWorkTimeDisplay = (r: AttendanceDay) => {
    if (!r.workMinutes) return <span className="text-slate-400 font-mono text-xs font-semibold">--</span>;
    // Colour follows the backend verdict (PRESENT vs everything else); no hour threshold lives here.
    return (
      <span
        className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold border ${
          r.status === 'PRESENT' ? 'bg-sky-50 border-sky-200 text-brand-600' : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}
      >
        {Math.floor(r.workMinutes / 60)}h {r.workMinutes % 60}m
      </span>
    );
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 shadow-card overflow-hidden flex flex-col">
      {isLoading ? (
        <TableSkeleton rows={8} cols={8} />
      ) : records.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="No Check-In / Check-Out Records Found"
            description="Select a different date range on the calendar or click 'Sync Attendance'."
            actionLabel="Sync Attendance"
            onAction={onSyncTrigger}
          />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Check-In</th>
                  <th className="py-3.5 px-4">Check-Out</th>
                  <th className="py-3.5 px-4">Work Hours</th>
                  <th className="py-3.5 px-4">Late In</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {records.map((r) => (
                  <tr
                    key={`${r.employeeCode}_${r.businessDate}`}
                    onClick={() => setSelectedDay(r)}
                    className="hover:bg-sky-50/50 transition-all group cursor-pointer"
                    title="Click to view details or adjust/change to WFH"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center text-xs text-brand-600 font-extrabold shadow-xs shrink-0">
                          {r.employeeName?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                            {r.employeeName}
                          </div>
                          <div className="font-mono text-[11px] text-brand-600 font-semibold">{r.employeeCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-medium">
                        <Building2 className="w-3 h-3 text-brand-500 shrink-0" />
                        {r.siteName || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-mono text-[11px] font-medium">
                      {formatBusinessDate(r.businessDate)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-xs">
                      {r.firstIn ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                          <LogIn className="w-3 h-3 text-emerald-600" />
                          {r.firstIn}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono font-medium">--:--</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-xs">
                      {r.lastOut ? (
                        <span className="inline-flex items-center gap-1 text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded font-bold">
                          <LogOut className="w-3 h-3 text-cyan-600" />
                          {r.lastOut}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono font-medium">--:--</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getWorkTimeDisplay(r)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-xs">
                      {!r.firstIn ? (
                        <span className="text-slate-400 text-[11px]">-</span>
                      ) : r.isLate ? (
                        <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold text-[11px]">
                          +{Math.floor(r.lateMinutes / 60)}h {r.lateMinutes % 60}m
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold text-[11px]">On Time</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(r)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                      {r.manualOverride ? (
                        <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-medium" title="Applied from an approved request">
                          Approved request
                        </span>
                      ) : r.origins.includes('ESS_WEB') ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-medium">Web punch</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span className="font-medium">
                Showing <strong className="text-slate-900">{Math.min((page - 1) * limit + 1, total)}</strong> to{' '}
                <strong className="text-slate-900">{Math.min(page * limit, total)}</strong> of{' '}
                <strong className="text-brand-600">{total.toLocaleString()}</strong> records
              </span>

              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <span className="text-[11px] font-medium text-slate-500">Rows:</span>
                <select
                  value={limit}
                  onChange={(e) => onLimitChange(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 text-xs font-semibold focus:outline-none focus:border-brand-500"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => onPageChange(1)}
                disabled={page <= 1}
                className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition-all shadow-xs"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition-all shadow-xs"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-3 py-1 font-heading font-bold text-slate-900 bg-white border border-slate-200 rounded-xl shadow-xs">
                Page {page} of {totalPages}
              </div>

              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition-all shadow-xs"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onPageChange(totalPages)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition-all shadow-xs"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      <DayAdjustmentModal
        isOpen={Boolean(selectedDay)}
        onClose={() => setSelectedDay(null)}
        day={selectedDay}
      />
    </div>
  );
};

