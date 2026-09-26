import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Fingerprint, ArrowRight, Building2, MonitorDot, Search, RefreshCw } from 'lucide-react';
import { AttendanceRecord } from '../../types';
import { TableSkeleton } from '../common/TableSkeleton';
import { EmptyState } from '../common/EmptyState';

interface RecentPunchesTableProps {
  punches: AttendanceRecord[];
  isLoading: boolean;
  onSyncTrigger?: () => void;
}

export const RecentPunchesTable: React.FC<RecentPunchesTableProps> = ({
  punches,
  isLoading,
  onSyncTrigger,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  const filteredPunches = punches.filter(
    (p) =>
      p.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sourceName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredPunches.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedPunches = filteredPunches.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (delta: number) => {
    const next = currentPage + delta;
    if (next >= 1 && next <= totalPages) {
      setCurrentPage(next);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-card space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-heading font-bold text-slate-900 text-sm flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-[#1184b0]" />
            <span>Live Biometric Swipes Feed</span>
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Latest synchronized transactions from hardware devices
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search employee or code..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#1184b0] transition-all"
            />
          </div>

          <Link
            to="/attendance"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1184b0] hover:text-[#0d6c92] transition-colors whitespace-nowrap"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : filteredPunches.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title="No Attendance Punches Recorded"
            description="Trigger a sync to fetch biometric records from e-Timeoffice."
            actionLabel="Sync Now"
            onAction={onSyncTrigger}
          />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-heading font-bold">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Emp Code</th>
                  <th className="py-3 px-4">Location Hub</th>
                  <th className="py-3 px-4">Punch Time</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-center">Machine</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedPunches.map((record) => (
                  <tr
                    key={record._id || record.vendorRecordHash}
                    className="hover:bg-slate-50/80 transition-all"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center text-xs text-[#1184b0] font-heading font-extrabold shadow-xs">
                          {record.employeeName?.charAt(0) || 'E'}
                        </div>
                        <span>{record.employeeName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 font-semibold">
                      {record.employeeCode}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                        <Building2 className="w-3 h-3 text-[#1184b0]" />
                        {record.sourceName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {record.entryTime}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {record.entryDate}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-600 border border-slate-200">
                        <MonitorDot className="w-3 h-3 text-cyan-600" />
                        ID: {record.machineId || '0'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-bold">
                        Verified
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 text-xs text-slate-600">
            <span className="font-medium">
              Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filteredPunches.length)} of{' '}
              <strong className="text-slate-900 font-bold">{filteredPunches.length}</strong> entries
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handlePageChange(-1)}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 disabled:opacity-30 text-slate-700 font-semibold transition-all"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#1184b0] to-[#011638] text-white font-bold shadow-sm">
                {currentPage}
              </span>
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 disabled:opacity-30 text-slate-700 font-semibold transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

