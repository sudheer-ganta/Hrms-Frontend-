import React, { useState, useEffect } from 'react';
import { LocationTabs } from '../components/layout/LocationTabs';
import { AttendanceFilterBar } from '../components/attendance/AttendanceFilterBar';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { api } from '../services/api';
import { AttendanceRecord, Pagination, AttendanceSource } from '../types';
import { Fingerprint } from 'lucide-react';
import { formatDateTime } from '../lib/utils';

interface RawSwipesPageProps {
  sources: AttendanceSource[];
  activeSourceId: string;
  onSelectSource: (id: string) => void;
  onOpenSync: (sourceId?: string) => void;
}

export const RawSwipes: React.FC<RawSwipesPageProps> = ({
  sources,
  activeSourceId,
  onSelectSource,
  onOpenSync,
}) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });

  const [fromDate, setFromDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [machineId, setMachineId] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSwipes = async (page = pagination.page, limit = pagination.limit) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getRawSwipes({
        sourceId: activeSourceId !== 'all' ? activeSourceId : undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search: searchQuery.trim() || undefined,
        machineId: machineId.trim() || undefined,
        page,
        limit,
      });

      setRecords(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch raw biometric swipes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSwipes(1, pagination.limit);
  }, [activeSourceId, fromDate, toDate, searchQuery, machineId]);

  const handleExportCSV = () => {
    if (records.length === 0) return;

    const headers = [
      'Employee Code',
      'Employee Name',
      'Punch Date',
      'Punch Time',
      'Machine ID',
      'M_Flag',
      'Location',
      'Synced At',
      'Record Hash',
    ];
    const rows = records.map((r) => [
      `"${r.employeeCode}"`,
      `"${r.employeeName}"`,
      `"${r.entryDate}"`,
      `"${r.entryTime}"`,
      `"${r.machineId}"`,
      `"${r.machineFlag || 'N/A'}"`,
      `"${r.sourceName}"`,
      `"${r.syncedAt}"`,
      `"${r.vendorRecordHash}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Raw_Biometric_Swipes_${activeSourceId}_${fromDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header & Location Switcher */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Fingerprint className="w-6 h-6 text-brand-500" />
            <span>Raw Biometric Swipes</span>
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Raw punch transactions received from e-Timeoffice API with M_Flag and hash verification
          </p>
        </div>

        <LocationTabs
          sources={sources}
          activeSourceId={activeSourceId}
          onSelectSource={onSelectSource}
          showAllOption={true}
        />
      </div>

      {/* Filter Bar */}
      <AttendanceFilterBar
        fromDate={fromDate}
        toDate={toDate}
        searchQuery={searchQuery}
        machineId={machineId}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onSearchChange={setSearchQuery}
        onMachineIdChange={setMachineId}
        onRefresh={() => fetchSwipes(pagination.page, pagination.limit)}
        onSyncNow={() => onOpenSync(activeSourceId !== 'all' ? activeSourceId : undefined)}
        onExportCSV={handleExportCSV}
        isRefreshing={isLoading}
      />

      {error && (
        <ErrorAlert
          title="Error Loading Raw Swipes"
          message={error}
          onRetry={() => fetchSwipes(pagination.page, pagination.limit)}
        />
      )}

      {/* Raw Swipes Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-card overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={8} cols={8} />
        ) : records.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No Raw Swipe Records Found"
              description="Sync biometric punch data to view raw incoming records."
              actionLabel="Sync Now"
              onAction={() => onOpenSync(activeSourceId !== 'all' ? activeSourceId : undefined)}
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
                    <th className="py-3.5 px-4">Punch Date</th>
                    <th className="py-3.5 px-4">Punch Time</th>
                    <th className="py-3.5 px-4">Machine ID</th>
                    <th className="py-3.5 px-4">M_Flag</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4">Synced At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {records.map((record) => (
                    <tr
                      key={record._id || record.vendorRecordHash}
                      className="hover:bg-slate-50/80 transition-all"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-600">
                        {record.employeeCode}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center text-xs text-brand-600 font-extrabold shadow-xs shrink-0">
                            {record.employeeName?.charAt(0) || 'E'}
                          </div>
                          <span className="font-bold text-slate-900">
                            {record.employeeName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">{record.entryDate}</td>
                      <td className="py-3.5 px-4 text-slate-800 font-mono font-bold">{record.entryTime}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-cyan-700 font-mono font-bold text-[11px]">
                          {record.machineId || '0'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                            record.machineFlag
                              ? 'bg-violet-50 border-violet-200 text-violet-700'
                              : 'bg-slate-100 border-slate-200 text-slate-500'
                          }`}
                        >
                          {record.machineFlag || 'NULL'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {record.sourceName}
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-500 font-mono">
                        {formatDateTime(record.syncedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium">
                Total <strong className="text-brand-600">{pagination.total}</strong> raw swipes
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchSwipes(pagination.page - 1, pagination.limit)}
                  disabled={pagination.page <= 1}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-semibold transition-all shadow-xs"
                >
                  Previous
                </button>
                <span className="px-3 py-1 font-heading font-bold text-slate-900 bg-white border border-slate-200 rounded-xl shadow-xs">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => fetchSwipes(pagination.page + 1, pagination.limit)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-semibold transition-all shadow-xs"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

