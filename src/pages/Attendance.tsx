import React, { useState, useEffect, useCallback } from 'react';
import { LocationTabs } from '../components/layout/LocationTabs';
import { InOutFilterBar } from '../components/attendance/InOutFilterBar';
import { AttendanceSummaryMetrics } from '../components/attendance/AttendanceSummaryMetrics';
import { DailyAttendanceTable } from '../components/attendance/DailyAttendanceTable';
import { TimesheetMatrix } from '../components/attendance/TimesheetMatrix';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { api, refreshApiData } from '../services/api';
import { useDataVersion, useLastUpdatedTime } from '../services/dataSync';
import { errorMessage } from '../lib/apiError';
import { datesBetween, istToday } from '../lib/businessDate';
import { downloadAttendanceSheet, groupPunches } from '../lib/attendanceSheetExport';
import {
  AttendanceDay,
  AttendanceSummary,
  TimesheetEmployee,
  RawPunch,
  Pagination,
  AttendanceSource,
  EmployeePayrollSummary,
  AttendanceStatus,
} from '../types';
import { CalendarCheck2, Clock, Table2, RefreshCw } from 'lucide-react';

interface AttendancePageProps {
  sources: AttendanceSource[];
  activeSourceId: string;
  onSelectSource: (id: string) => void;
  onOpenSync: (sourceId?: string) => void;
}

export const Attendance: React.FC<AttendancePageProps> = ({ sources, activeSourceId, onSelectSource, onOpenSync }) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'timesheet'>('daily');

  // Daily view: one resolved row per employee per date
  const [dayRows, setDayRows] = useState<AttendanceDay[]>([]);
  const [daySummary, setDaySummary] = useState<AttendanceSummary | undefined>();
  const [dayPagination, setDayPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 1 });

  // Timesheet
  const [timesheets, setTimesheets] = useState<TimesheetEmployee[]>([]);
  const [timesheetDates, setTimesheetDates] = useState<string[]>([]);
  const [payrollSummaries, setPayrollSummaries] = useState<Record<string, EmployeePayrollSummary>>({});

  const [fromDate, setFromDate] = useState<string>(() => istToday());
  const [toDate, setToDate] = useState<string>(() => istToday());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const siteId = activeSourceId !== 'all' ? activeSourceId : undefined;

  const fetchDays = useCallback(async (page = 1, limit = dayPagination.limit) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getAttendanceDays({
        siteId, fromDate, toDate, search: searchQuery.trim() || undefined,
        status: statusFilter !== 'all' ? (statusFilter as AttendanceStatus) : undefined, page, limit,
      });
      setDayRows(res.data);
      setDayPagination(res.pagination);
      setDaySummary(res.summary);
    } catch (err) {
      setError(errorMessage(err, 'Failed to fetch attendance records'));
    } finally {
      setIsLoading(false);
    }
  }, [siteId, fromDate, toDate, searchQuery, statusFilter, dayPagination.limit]);

  const fetchTimesheet = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dates = datesBetween(fromDate, toDate);
      setTimesheetDates(dates);
      // Payroll figures come from the payroll engine: the month the range ends in.
      const [sheets, payroll] = await Promise.all([
        api.getTimesheet({ siteId, fromDate, toDate, search: searchQuery.trim() || undefined }),
        api.getAllPayroll(toDate.slice(0, 7)).catch(() => [] as EmployeePayrollSummary[]),
      ]);
      setTimesheets(sheets);
      const map: Record<string, EmployeePayrollSummary> = {};
      for (const p of payroll) map[p.empCode] = p;
      setPayrollSummaries(map);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load the monthly sheet'));
    } finally {
      setIsLoading(false);
    }
  }, [siteId, fromDate, toDate, searchQuery]);

  const dataVersion = useDataVersion();
  const lastUpdated = useLastUpdatedTime();
  useEffect(() => {
    if (activeTab === 'daily') fetchDays(1, dayPagination.limit);
    else fetchTimesheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeSourceId, fromDate, toDate, searchQuery, statusFilter, dataVersion]);

  // Every machine punch in the range, so the Excel file can show lunch and other break punches (Out1 to In8).
  const fetchAllPunches = async (sheets: TimesheetEmployee[]): Promise<RawPunch[]> => {
    const PAGE = 200;
    const base = { fromDate, toDate, limit: PAGE };
    // A search for one or a few people only needs their own punches.
    const codes = sheets.length <= 3 ? sheets.map((t) => t.employeeCode) : [undefined];
    const all: RawPunch[] = [];
    for (const employeeCode of codes) {
      const first = await api.getRawPunches({ ...base, employeeCode, page: 1 });
      all.push(...first.data);
      const pages = Array.from({ length: Math.max(0, first.pagination.totalPages - 1) }, (_, i) => i + 2);
      for (let i = 0; i < pages.length; i += 4) {
        const batch = await Promise.all(pages.slice(i, i + 4).map((page) => api.getRawPunches({ ...base, employeeCode, page })));
        for (const res of batch) all.push(...res.data);
      }
    }
    return all;
  };

  // Both the Daily list and the Monthly Sheet download the same In/Out report: one block per employee, one row per date.
  const exportInOutSheet = async () => {
    setIsExporting(true);
    try {
      // The daily list is paged and can be filtered by status; the report always covers everyone in the range.
      const sheets = activeTab === 'timesheet'
        ? timesheets
        : await api.getTimesheet({ siteId, fromDate, toDate, search: searchQuery.trim() || undefined });
      if (sheets.length === 0) return;
      const punches = groupPunches(await fetchAllPunches(sheets));
      await downloadAttendanceSheet(sheets, datesBetween(fromDate, toDate), punches);
    } catch (err) {
      setError(errorMessage(err, 'Could not create the Excel file'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = () => {
    if (activeTab === 'daily' && dayRows.length === 0) return;
    if (activeTab === 'timesheet' && timesheets.length === 0) return;
    void exportInOutSheet();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title & Location Switcher */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarCheck2 className="w-6 h-6 text-brand-500" />
              <span>Attendance</span>
            </h1>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Who came, when they came and left, and how many hours they worked
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-[11px] font-medium text-slate-600 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })} IST</span>
            </div>

            <button
              type="button"
              onClick={() => {
                refreshApiData();
                if (activeTab === 'daily') fetchDays(dayPagination.page, dayPagination.limit);
                else fetchTimesheet();
              }}
              disabled={isLoading}
              className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-brand-500 rounded-xl transition-all shadow-xs flex items-center gap-1.5 text-xs font-semibold"
              title="Reload attendance"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-500' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        <LocationTabs
          sources={sources}
          activeSourceId={activeSourceId}
          onSelectSource={onSelectSource}
          showAllOption={true}
        />
      </div>

      {/* Main Mode Navigation Tabs (Light Pill Container) */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-card overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-heading font-bold transition-all ${
            activeTab === 'daily'
              ? 'bg-gradient-to-r from-brand-500 to-brand-base text-white shadow-md shadow-brand-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Daily Attendance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('timesheet')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-heading font-bold transition-all ${
            activeTab === 'timesheet'
              ? 'bg-gradient-to-r from-brand-500 to-brand-base text-white shadow-md shadow-brand-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Table2 className="w-4 h-4" />
          <span>Monthly Sheet</span>
        </button>
      </div>

      {/* Filter Bar */}
      <InOutFilterBar
        fromDate={fromDate}
        toDate={toDate}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onSearchChange={setSearchQuery}
        onStatusFilterChange={setStatusFilter}
        onRefresh={() => { refreshApiData(); if (activeTab === 'daily') fetchDays(dayPagination.page, dayPagination.limit); else fetchTimesheet(); }}
        onSyncNow={() => onOpenSync(activeSourceId !== 'all' ? activeSourceId : undefined)}
        onExportCSV={handleExport}
        isRefreshing={isLoading}
        isExporting={isExporting}
      />

      {error && (
        <ErrorAlert
          title="Could not load attendance"
          message={error}
          onRetry={() => { refreshApiData(); if (activeTab === 'daily') fetchDays(); else fetchTimesheet(); }}
        />
      )}

      {/* Tab 1: Daily In/Out View */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          <AttendanceSummaryMetrics summary={daySummary} isLoading={isLoading} />
          <DailyAttendanceTable
            records={dayRows}
            pagination={dayPagination}
            isLoading={isLoading}
            onPageChange={(p) => fetchDays(p, dayPagination.limit)}
            onLimitChange={(l) => fetchDays(1, l)}
            onSyncTrigger={() => onOpenSync(activeSourceId !== 'all' ? activeSourceId : undefined)}
          />
        </div>
      )}

      {/* Tab 2: Timesheet Matrix View */}
      {activeTab === 'timesheet' && (
        <TimesheetMatrix
          timesheets={timesheets}
          dates={timesheetDates}
          payrollSummaries={payrollSummaries}
          isLoading={isLoading}
          onSyncTrigger={() => onOpenSync(activeSourceId !== 'all' ? activeSourceId : undefined)}
        />
      )}

    </div>
  );
};

