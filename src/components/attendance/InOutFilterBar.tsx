import React from 'react';
import { 
  Search, 
  Calendar, 
  RefreshCw, 
  Download, 
  X
} from 'lucide-react';
import { addDays, addMonths, daysInMonth, istMonth, istToday } from '../../lib/businessDate';
import { ATTENDANCE_STATUSES } from '../../types';
import { STATUS_META } from '../../lib/attendanceDisplay';

interface InOutFilterBarProps {
  fromDate: string;
  toDate: string;
  searchQuery: string;
  statusFilter: string;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  onSearchChange: (search: string) => void;
  onStatusFilterChange: (status: string) => void;
  onRefresh: () => void;
  onSyncNow: () => void;
  onExportCSV: () => void;
  isRefreshing?: boolean;
  /** Text of the download button. Both Attendance lists download the same In/Out Excel report. */
  exportLabel?: string;
  /** True while the download is being prepared (the Excel file collects every punch first). */
  isExporting?: boolean;
}

export const InOutFilterBar: React.FC<InOutFilterBarProps> = ({
  fromDate,
  toDate,
  searchQuery,
  statusFilter,
  onFromDateChange,
  onToDateChange,
  onSearchChange,
  onStatusFilterChange,
  onRefresh,
  onSyncNow,
  onExportCSV,
  isRefreshing,
  exportLabel = 'Download Excel',
  isExporting,
}) => {
  const setQuickRange = (type: 'today' | 'yesterday' | 'week' | 'lastMonth') => {
    // IST business dates (never the browser's local or UTC date).
    const today = istToday();
    if (type === 'today') {
      onFromDateChange(today);
      onToDateChange(today);
    } else if (type === 'yesterday') {
      const y = addDays(today, -1);
      onFromDateChange(y);
      onToDateChange(y);
    } else if (type === 'week') {
      onFromDateChange(addDays(today, -7));
      onToDateChange(today);
    } else if (type === 'lastMonth') {
      // The whole previous calendar month, first day to last day: the range payroll is run for.
      const days = daysInMonth(addMonths(istMonth(), -1));
      onFromDateChange(days[0]);
      onToDateChange(days[days.length - 1]);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-card space-y-4">
      {/* Top Row: Search + Quick Presets + Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or ID"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date Presets */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start lg:self-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setQuickRange('today')}
            className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-all shadow-xs"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setQuickRange('yesterday')}
            className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-all shadow-xs"
          >
            Yesterday
          </button>
          <button
            type="button"
            onClick={() => setQuickRange('week')}
            className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-all shadow-xs"
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => setQuickRange('lastMonth')}
            className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-all shadow-xs"
          >
            Last Month
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl transition-all shadow-xs"
            title="Reload"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-500' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onExportCSV}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 disabled:opacity-60 px-3.5 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-all shadow-xs"
            title={exportLabel}
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">{isExporting ? 'Preparing…' : exportLabel}</span>
          </button>

          <button
            type="button"
            onClick={onSyncNow}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-base hover:opacity-95 text-white text-xs font-heading font-bold rounded-xl shadow-md shadow-brand-500/20 transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Get Latest Punches</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Calendar Inputs & Status Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Date Range:</span>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-brand-500 shrink-0" />
            <span className="text-slate-500 text-[11px] font-medium">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => onFromDateChange(e.target.value)}
              className="bg-transparent text-slate-800 text-xs font-medium focus:outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-brand-500 shrink-0" />
            <span className="text-slate-500 text-[11px] font-medium">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => onToDateChange(e.target.value)}
              className="bg-transparent text-slate-800 text-xs font-medium focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Show:</span>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-brand-500"
          >
            <option value="all">Everyone</option>
            {ATTENDANCE_STATUSES.map((st) => (
              <option key={st} value={st}>{STATUS_META[st].label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

