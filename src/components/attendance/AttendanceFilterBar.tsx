import React from 'react';
import { 
  Search, 
  Calendar, 
  RefreshCw, 
  Download, 
  X
} from 'lucide-react';

interface AttendanceFilterBarProps {
  fromDate: string;
  toDate: string;
  searchQuery: string;
  machineId: string;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  onSearchChange: (search: string) => void;
  onMachineIdChange: (machine: string) => void;
  onRefresh: () => void;
  onSyncNow: () => void;
  onExportCSV: () => void;
  isRefreshing?: boolean;
}

export const AttendanceFilterBar: React.FC<AttendanceFilterBarProps> = ({
  fromDate,
  toDate,
  searchQuery,
  machineId,
  onFromDateChange,
  onToDateChange,
  onSearchChange,
  onMachineIdChange,
  onRefresh,
  onSyncNow,
  onExportCSV,
  isRefreshing,
}) => {
  const handleQuickToday = () => {
    const today = new Date().toISOString().split('T')[0];
    onFromDateChange(today);
    onToDateChange(today);
  };

  return (
    <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-card space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee name or code (e.g. 0001, Jignesh)..."
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

        {/* Date Controls */}
        <div className="flex flex-wrap items-center gap-2">
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

          <button
            type="button"
            onClick={handleQuickToday}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700 transition-all shadow-xs"
          >
            Today
          </button>
        </div>

        {/* Machine & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Machine ID"
            value={machineId}
            onChange={(e) => onMachineIdChange(e.target.value)}
            className="w-24 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
          />

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl transition-all shadow-xs"
            title="Refresh Table"
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
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            type="button"
            onClick={onSyncNow}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-base hover:opacity-95 text-white text-xs font-heading font-bold rounded-xl shadow-md shadow-brand-500/20 transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};

