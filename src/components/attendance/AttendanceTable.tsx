import React from 'react';
import { 
  Building2, 
  MonitorDot, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Clock,
  Calendar
} from 'lucide-react';
import { AttendanceRecord, Pagination } from '../../types';
import { TableSkeleton } from '../common/TableSkeleton';
import { EmptyState } from '../common/EmptyState';

interface AttendanceTableProps {
  records: AttendanceRecord[];
  pagination: Pagination;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  onSyncTrigger: () => void;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  records,
  pagination,
  isLoading,
  onPageChange,
  onLimitChange,
  onSyncTrigger,
}) => {
  const { page, limit, total, totalPages } = pagination;

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 shadow-card overflow-hidden flex flex-col">
      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : records.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="No Attendance Records Found"
            description="Try changing the date range, search query, or syncing this location."
            actionLabel="Sync Now"
            onAction={onSyncTrigger}
          />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Employee Code</th>
                  <th className="py-3.5 px-4">Employee Name</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Time</th>
                  <th className="py-3.5 px-4">Machine</th>
                  <th className="py-3.5 px-4">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {records.map((record, idx) => (
                  <tr
                    key={record._id || record.vendorRecordHash || `${record.sourceId}_${record.employeeCode}_${idx}`}
                    className="hover:bg-slate-50/80 transition-all group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-600">
                      {record.employeeCode}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center text-xs text-brand-600 font-extrabold shadow-xs shrink-0">
                          {record.employeeName?.charAt(0) || 'E'}
                        </div>
                        <span className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                          {record.employeeName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{record.entryDate}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700 font-bold whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-brand-500" />
                        <span>{record.entryTime}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-mono font-medium text-slate-700">
                        <MonitorDot className="w-3 h-3 text-cyan-600" />
                        {record.machineId || '0'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-medium">
                        <Building2 className="w-3 h-3 text-brand-500" />
                        {record.sourceName}
                      </span>
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
                <strong className="text-brand-600">{total}</strong> records
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
    </div>
  );
};

