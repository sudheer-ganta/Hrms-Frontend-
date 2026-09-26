import React from 'react';
import { 
  Search, 
  Calendar, 
  RefreshCw, 
  Download, 
  X
} from 'lucide-react';

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
}) => {
  const setQuickRange = (type: 'today' | 'yesterday' | 'week' | 'month') => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (type === 'today') {
      const t = formatDate(today);
      onFromDateChange(t);
      onToDateChange(t);
    } else if (type === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const str = formatDate(y);
      onFromDateChange(str);
      onToDateChange(str);
    } else if (type === 'week') {
      const past7 = new Date(today);
      past7.setDate(past7.getDate() - 7);
      onFromDateChange(formatDate(past7));
      onToDateChange(formatDate(today));
    } else if (type === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      onFromDateChange(formatDate(firstDay));
      onToDateChange(formatDate(today));
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
            placeholder="Search employee name or code..."
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
            onClick={() => setQuickRange('month')}
            className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-all shadow-xs"
          >
            This Month
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl transition-all shadow-xs"
            title="Refresh Attendance Table"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-500' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-all shadow-xs"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            type="button"
            onClick={onSyncNow}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-base hover:opacity-95 text-white text-xs font-heading font-bold rounded-xl shadow-md shadow-brand-500/20 transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Attendance</span>
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
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="P">Present (P)</option>
            <option value="A">Absent (A)</option>
            <option value="P/2">Half Day (P/2)</option>
            <option value="W">Weekly Off (W)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

