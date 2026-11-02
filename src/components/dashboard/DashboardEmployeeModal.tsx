import React, { useEffect, useMemo, useState } from 'react';
import { X, Search } from 'lucide-react';
import { api } from '../../services/api';
import { useDataVersion } from '../../services/dataSync';
import { DashboardEmployeeRow, DashboardListCategory } from '../../types';
import { metaFor } from '../../lib/attendanceDisplay';
import { formatMinutes } from '../../lib/attendanceDisplay';
import { errorMessage } from '../../lib/apiError';
import { to12h } from '../common/TimeInput';
import { ErrorAlert } from '../common/ErrorAlert';
import { EmptyState } from '../common/EmptyState';

interface DashboardEmployeeModalProps {
  category: DashboardListCategory;
  title: string;
  date: string;
  /** Location id, or 'all'. */
  siteId: string;
  onClose: () => void;
  onSelectEmployee: (row: DashboardEmployeeRow) => void;
}

export const DashboardEmployeeModal: React.FC<DashboardEmployeeModalProps> = ({ category, title, date, siteId, onClose, onSelectEmployee }) => {
  const [rows, setRows] = useState<DashboardEmployeeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const dataVersion = useDataVersion();

  const load = React.useCallback(() => {
    let cancelled = false;
    setError(null);
    api.getDashboardEmployees({ date, siteId: siteId !== 'all' ? siteId : undefined, category })
      .then((res) => { if (!cancelled) setRows(res.rows); })
      .catch((err) => { if (!cancelled) setError(errorMessage(err, 'Failed to load the employee list')); });
    return () => { cancelled = true; };
  }, [date, siteId, category]);

  useEffect(() => load(), [load, dataVersion]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!rows) return [];
    if (!needle) return rows;
    return rows.filter((r) => r.employeeName.toLowerCase().includes(needle) || r.employeeCode.toLowerCase().includes(needle) || (r.department || '').toLowerCase().includes(needle));
  }, [rows, query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="font-heading font-extrabold text-base text-slate-900 truncate">{title}</h2>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {rows ? `${shown.length}${shown.length !== rows.length ? ` of ${rows.length}` : ''} employees` : 'Loading…'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, code, department"
                className="pl-8 pr-3 py-1.5 w-56 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-all" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-auto flex-1">
          {error ? (
            <div className="p-4"><ErrorAlert message={error} onRetry={load} /></div>
          ) : !rows ? (
            <div className="p-5 space-y-2">
              {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-9 bg-slate-100 rounded-lg animate-pulse" />)}
            </div>
          ) : shown.length === 0 ? (
            <div className="p-4"><EmptyState icon="search" title="No employees to show" description={query ? 'No one matches your search.' : 'Nobody falls in this group for the selected day.'} /></div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-heading">
                <tr>
                  <th className="px-5 py-2.5 font-bold">Employee</th>
                  <th className="px-3 py-2.5 font-bold">Department</th>
                  <th className="px-3 py-2.5 font-bold">Location</th>
                  <th className="px-3 py-2.5 font-bold">Status</th>
                  <th className="px-3 py-2.5 font-bold">In</th>
                  <th className="px-3 py-2.5 font-bold">Out</th>
                  <th className="px-5 py-2.5 font-bold text-right">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((r) => {
                  const meta = metaFor(r.status);
                  return (
                    <tr key={r.employeeCode} onClick={() => onSelectEmployee(r)} className="hover:bg-slate-50 cursor-pointer">
                      <td className="px-5 py-2.5">
                        <div className="font-semibold text-slate-900">{r.employeeName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{r.employeeCode}</div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{r.department || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600">{r.siteName || '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold ${meta.badge}`}>{r.inProgress ? 'Checked in' : r.statusLabel || meta.label}</span>
                        {r.isLate && <span className="ml-1.5 text-[10px] font-bold text-amber-700">Late {r.lateMinutes}m</span>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 font-mono">{r.firstIn ? to12h(r.firstIn) : '—'}</td>
                      <td className="px-3 py-2.5 text-slate-700 font-mono">{r.lastOut ? to12h(r.lastOut) : '—'}</td>
                      <td className="px-5 py-2.5 text-right text-slate-700 font-mono">{r.workMinutes > 0 ? formatMinutes(r.workMinutes) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
