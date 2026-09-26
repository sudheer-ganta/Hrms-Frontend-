import React, { useState, useEffect } from 'react';
import { LocationTabs } from '../components/layout/LocationTabs';
import { StatusBadge } from '../components/common/StatusBadge';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { api } from '../services/api';
import { SyncLog, Pagination, AttendanceSource } from '../types';
import { History, RefreshCw, X } from 'lucide-react';
import { formatDateTime, humanizeSyncError } from '../lib/utils';

interface SyncHistoryPageProps {
  sources: AttendanceSource[];
  activeSourceId: string;
  onSelectSource: (id: string) => void;
  onOpenSync: (sourceId?: string) => void;
}

export const SyncHistory: React.FC<SyncHistoryPageProps> = ({
  sources,
  activeSourceId,
  onSelectSource,
  onOpenSync,
}) => {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Log Details Modal
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null);

  const fetchLogs = async (page = pagination.page, limit = pagination.limit) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getSyncLogs({
        sourceId: activeSourceId !== 'all' ? activeSourceId : undefined,
        status: statusFilter || undefined,
        page,
        limit,
      });

      setLogs(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch sync history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1, pagination.limit);
  }, [activeSourceId, statusFilter]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header & Location Switcher */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <History className="w-6 h-6 text-amber-500" />
              <span>Biometric Sync History</span>
            </h1>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Audit logs of all automated and manual e-Timeoffice API synchronization operations
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenSync(activeSourceId !== 'all' ? activeSourceId : undefined)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-base hover:opacity-95 text-white text-xs font-heading font-bold rounded-xl shadow-md shadow-brand-500/20 transition-all active:scale-95 self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Attendance</span>
          </button>
        </div>

        <LocationTabs
          sources={sources}
          activeSourceId={activeSourceId}
          onSelectSource={onSelectSource}
          showAllOption={true}
        />
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-4 shadow-card">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="RUNNING">Running</option>
            <option value="FAILED">Failed</option>
            <option value="PARTIAL">Partial</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => fetchLogs(pagination.page, pagination.limit)}
          disabled={isLoading}
          className="p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 transition-all shadow-xs"
          title="Refresh Logs"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-500' : ''}`} />
        </button>
      </div>

      {error && (
        <ErrorAlert
          title="Error Fetching Logs"
          message={error}
          onRetry={() => fetchLogs(pagination.page, pagination.limit)}
        />
      )}

      {/* Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-card overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={8} />
        ) : logs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No Synchronization Logs Recorded"
              description="Click 'Sync Attendance' to trigger your first synchronization with e-Timeoffice."
              actionLabel="Sync Attendance"
              onAction={() => onOpenSync(activeSourceId !== 'all' ? activeSourceId : undefined)}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Started</th>
                    <th className="py-3.5 px-4">Completed</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Fetched</th>
                    <th className="py-3.5 px-4 text-right">Inserted</th>
                    <th className="py-3.5 px-4 text-right">Duplicates</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {logs.map((log) => (
                    <tr
                      key={log._id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-all"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {log.sourceName || log.sourceId}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            log.syncType === 'RAW'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-sky-50 text-brand-700 border-sky-200'
                          }`}
                        >
                          {log.syncType === 'RAW' ? 'Raw Scans' : 'Daily Attendance'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 font-medium">
                        {formatDateTime(log.startedAt)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 font-medium">
                        {log.completedAt ? formatDateTime(log.completedAt) : 'In Progress...'}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={log.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        {log.recordsFetched ?? 0}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-brand-600">
                        {log.recordsInserted ?? 0}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-700">
                        {log.recordsSkipped ?? 0}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="px-3 py-1 text-[11px] font-bold text-brand-600 bg-sky-50 border border-sky-200 rounded-lg hover:bg-brand-500 hover:text-white transition-all shadow-xs"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium">
                Total <strong className="text-brand-600">{pagination.total}</strong> sync events
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchLogs(pagination.page - 1, pagination.limit)}
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
                  onClick={() => fetchLogs(pagination.page + 1, pagination.limit)}
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

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-brand-500" />
                <h3 className="font-heading font-bold text-slate-900">Sync Log Details</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold uppercase tracking-wider">Location</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedLog.sourceName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold uppercase tracking-wider mb-1">Status</span>
                  <StatusBadge status={selectedLog.status} size="sm" />
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold uppercase tracking-wider">Type</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedLog.syncType === 'RAW' ? 'Raw Fingerprint Scans' : 'Daily Attendance & Hours'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold uppercase tracking-wider">Started</span>
                  <span className="font-mono text-slate-700 font-medium">{formatDateTime(selectedLog.startedAt)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold uppercase tracking-wider">Completed</span>
                  <span className="font-mono text-slate-700 font-medium">
                    {selectedLog.completedAt ? formatDateTime(selectedLog.completedAt) : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Fetched</span>
                  <span className="font-heading font-extrabold text-slate-900 text-xl mt-0.5 block">{selectedLog.recordsFetched}</span>
                </div>
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-center">
                  <span className="text-brand-600 block text-[10px] font-semibold uppercase tracking-wider">Inserted</span>
                  <span className="font-heading font-extrabold text-brand-600 text-xl mt-0.5 block">{selectedLog.recordsInserted}</span>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <span className="text-amber-700 block text-[10px] font-semibold uppercase tracking-wider">Duplicates</span>
                  <span className="font-heading font-extrabold text-amber-700 text-xl mt-0.5 block">{selectedLog.recordsSkipped}</span>
                </div>
              </div>

              {selectedLog.errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
                  <span className="font-bold text-rose-800 block mb-1">What happened:</span>
                  <p className="text-[11px] leading-relaxed break-words mb-2">
                    {humanizeSyncError(selectedLog.errorMessage)}
                  </p>
                  <p className="font-mono text-[10px] leading-relaxed break-words opacity-60">
                    {selectedLog.errorMessage}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-heading font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

