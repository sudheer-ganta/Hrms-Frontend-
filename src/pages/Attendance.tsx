import React, { useState, useEffect, useCallback } from 'react';
import { LocationTabs } from '../components/layout/LocationTabs';
import { InOutFilterBar } from '../components/attendance/InOutFilterBar';
import { AttendanceSummaryMetrics } from '../components/attendance/AttendanceSummaryMetrics';
import { DailyAttendanceTable } from '../components/attendance/DailyAttendanceTable';
import { TimesheetMatrix } from '../components/attendance/TimesheetMatrix';
import { AttendanceTable } from '../components/attendance/AttendanceTable';
import { AttendanceFilterBar } from '../components/attendance/AttendanceFilterBar';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { api } from '../services/api';
import { useDataVersion } from '../services/dataSync';
import { errorMessage } from '../lib/apiError';
import { datesBetween, istToday } from '../lib/businessDate';
import { formatMinutes } from '../lib/attendanceDisplay';
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
import { CalendarCheck2, Clock, Table2, Fingerprint } from 'lucide-react';

interface AttendancePageProps {
  sources: AttendanceSource[];
  activeSourceId: string;
  onSelectSource: (id: string) => void;
  onOpenSync: (sourceId?: string) => void;
}

const downloadCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(q).join(','), ...rows.map((r) => r.map(q).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const Attendance: React.FC<AttendancePageProps> = ({ sources, activeSourceId, onSelectSource, onOpenSync }) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'timesheet' | 'raw'>('daily');

  // Daily view: one resolved row per employee per date
  const [dayRows, setDayRows] = useState<AttendanceDay[]>([]);
  const [daySummary, setDaySummary] = useState<AttendanceSummary | undefined>();
  const [dayPagination, setDayPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 1 });

  // Timesheet
  const [timesheets, setTimesheets] = useState<TimesheetEmployee[]>([]);
  const [timesheetDates, setTimesheetDates] = useState<string[]>([]);
  const [payrollSummaries, setPayrollSummaries] = useState<Record<string, EmployeePayrollSummary>>({});

  // Raw punches
  const [rawRecords, setRawRecords] = useState<RawPunch[]>([]);
  const [rawPagination, setRawPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 1 });

  const [fromDate, setFromDate] = useState<string>(() => istToday());
  const [toDate, setToDate] = useState<string>(() => istToday());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [machineId, setMachineId] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
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
      setError(errorMessage(err, 'Failed to load timesheet matrix'));
    } finally {
      setIsLoading(false);
    }
  }, [siteId, fromDate, toDate, searchQuery]);

  const fetchRawPunches = useCallback(async (page = 1, limit = rawPagination.limit) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getRawPunches({
        sourceId: activeSourceId !== 'all' ? activeSourceId : undefined, fromDate, toDate,
        search: searchQuery.trim() || undefined, machineId: machineId.trim() || undefined, page, limit,
      });
      setRawRecords(res.data);
      setRawPagination(res.pagination);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load raw punch records'));
    } finally {
      setIsLoading(false);
    }
  }, [activeSourceId, fromDate, toDate, searchQuery, machineId, rawPagination.limit]);

  const dataVersion = useDataVersion();
  useEffect(() => {
    if (activeTab === 'daily') fetchDays(1, dayPagination.limit);
    else if (activeTab === 'timesheet') fetchTimesheet();
    else fetchRawPunches(1, rawPagination.limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeSourceId, fromDate, toDate, searchQuery, statusFilter, machineId, dataVersion]);

  const handleExportCSV = () => {
    if (activeTab === 'daily') {
      if (dayRows.length === 0) return;
      downloadCsv(
        `ColorMyles_Attendance_${activeSourceId}_${fromDate}_to_${toDate}.csv`,
        ['Employee Code', 'Employee Name', 'Location', 'Date', 'Check In', 'Check Out', 'Work Time', 'Overtime', 'Late (min)', 'Status', 'Source'],
        dayRows.map((r) => [
          r.employeeCode, r.employeeName, r.siteName ?? '', r.businessDate, r.firstIn ?? '', r.lastOut ?? '',
          formatMinutes(r.workMinutes), formatMinutes(r.overtimeMinutes), r.isLate ? r.lateMinutes : 0, r.statusLabel,
          r.manualOverride ? 'Approved request' : r.origins.join('+'),
        ])
      );
    } else if (activeTab === 'timesheet') {
      if (timesheets.length === 0) return;
      downloadCsv(
        `ColorMyles_Timesheet_${activeSourceId}_${fromDate}_to_${toDate}.csv`,
        ['Employee Code', 'Employee Name', 'Location', 'Present', 'Half Days', 'Paid Leave', 'Absent', 'Work Hours', ...timesheetDates],
        timesheets.map((t) => [
          t.employeeCode, t.employeeName, t.siteName ?? '', t.totals.presentDays, t.totals.halfDays, t.totals.leaveDays, t.totals.absentDays,
          formatMinutes(t.totals.workMinutes), ...timesheetDates.map((d) => t.days[d]?.statusLabel ?? ''),
        ])
      );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title & Location Switcher */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarCheck2 className="w-6 h-6 text-brand-500" />
              <span>ColorMyles Attendance & Work Hours Hub</span>
            </h1>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Daily Check-In/Out records, automated hours calculation, overtime, and monthly timesheets
            </p>
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
          <span>Daily Check-In / Out & Work Hours</span>
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
          <span>Work Hours Timesheet Matrix</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('raw')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-heading font-bold transition-all ${
            activeTab === 'raw'
              ? 'bg-gradient-to-r from-brand-500 to-brand-base text-white shadow-md shadow-brand-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Fingerprint className="w-4 h-4" />
          <span>Raw Biometric Swipes</span>
        </button>
      </div>

      {/* Filter Bar */}
      {activeTab === 'raw' ? (
        <AttendanceFilterBar
          fromDate={fromDate}
          toDate={toDate}
          searchQuery={searchQuery}
          machineId={machineId}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          onSearchChange={setSearchQuery}
          onMachineIdChange={setMachineId}
          onRefresh={() => fetchRawPunches(rawPagination.page, rawPagination.limit)}
          onSyncNow={() => onOpenSync(activeSourceId !== 'all' ? activeSourceId : undefined)}
          onExportCSV={handleExportCSV}
          isRefreshing={isLoading}
        />
      ) : (
        <InOutFilterBar
          fromDate={fromDate}
          toDate={toDate}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          onSearchChange={setSearchQuery}
          onStatusFilterChange={setStatusFilter}
          onRefresh={() => (activeTab === 'daily' ? fetchDays(dayPagination.page, dayPagination.limit) : fetchTimesheet())}
          onSyncNow={() => onOpenSync(activeSourceId !== 'all' ? activeSourceId : undefined)}
          onExportCSV={handleExportCSV}
          isRefreshing={isLoading}
        />
      )}

      {error && (
        <ErrorAlert
          title="Error Loading Attendance"
          message={error}
          onRetry={() => (activeTab === 'daily' ? fetchDays() : activeTab === 'timesheet' ? fetchTimesheet() : fetchRawPunches())}
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

      {/* Tab 3: Raw Biometric Swipes View */}
      {activeTab === 'raw' && (
        <AttendanceTable
          records={rawRecords}
          pagination={rawPagination}
          isLoading={isLoading}
          onPageChange={(p) => fetchRawPunches(p, rawPagination.limit)}
          onLimitChange={(l) => fetchRawPunches(1, l)}
          onSyncTrigger={() => onOpenSync(activeSourceId !== 'all' ? activeSourceId : undefined)}
        />
      )}
    </div>
  );
};

