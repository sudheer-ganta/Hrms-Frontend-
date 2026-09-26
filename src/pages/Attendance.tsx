import React, { useState, useEffect } from 'react';
import { LocationTabs } from '../components/layout/LocationTabs';
import { InOutFilterBar } from '../components/attendance/InOutFilterBar';
import { AttendanceSummaryMetrics } from '../components/attendance/AttendanceSummaryMetrics';
import { DailyAttendanceTable } from '../components/attendance/DailyAttendanceTable';
import { TimesheetMatrix } from '../components/attendance/TimesheetMatrix';
import { AttendanceTable } from '../components/attendance/AttendanceTable';
import { AttendanceFilterBar } from '../components/attendance/AttendanceFilterBar';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { api } from '../services/api';
import {
  InOutRecord,
  InOutSummary,
  EmployeeTimesheet,
  AttendanceRecord,
  Pagination,
  AttendanceSource,
  EmployeePayrollSummary
} from '../types';
import { 
  CalendarCheck2, 
  Clock, 
  Table2, 
  Fingerprint
} from 'lucide-react';

interface AttendancePageProps {
  sources: AttendanceSource[];
  activeSourceId: string;
  onSelectSource: (id: string) => void;
  onOpenSync: (sourceId?: string) => void;
}

export const Attendance: React.FC<AttendancePageProps> = ({
  sources,
  activeSourceId,
  onSelectSource,
  onOpenSync,
}) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'timesheet' | 'raw'>('daily');

  // Daily In/Out State
  const [inOutRecords, setInOutRecords] = useState<InOutRecord[]>([]);
  const [inOutSummary, setInOutSummary] = useState<InOutSummary | undefined>();
  const [inOutPagination, setInOutPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });

  // Timesheet State
  const [timesheets, setTimesheets] = useState<EmployeeTimesheet[]>([]);
  const [timesheetDates, setTimesheetDates] = useState<string[]>([]);
  const [payrollSummaries, setPayrollSummaries] = useState<Record<string, EmployeePayrollSummary>>({});

  // Raw Punches State
  const [rawRecords, setRawRecords] = useState<AttendanceRecord[]>([]);
  const [rawPagination, setRawPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });

  // Common Filters — default to today only, so opening this page doesn't pull a
  // full month of records for every employee before you've even asked for it.
  const [fromDate, setFromDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [machineId, setMachineId] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const generateDatesList = (start: string, end: string) => {
    const list: string[] = [];
    const current = new Date(start);
    const last = new Date(end);
    while (current <= last) {
      list.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return list;
  };

  const fetchDailyInOut = async (page = inOutPagination.page, limit = inOutPagination.limit) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getInOutAttendance({
        sourceId: activeSourceId !== 'all' ? activeSourceId : undefined,
        fromDate,
        toDate,
        search: searchQuery.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page,
        limit,
      });

      setInOutRecords(res.data);
      setInOutPagination(res.pagination);
      setInOutSummary(res.summary);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch attendance records');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTimesheet = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dates = generateDatesList(fromDate, toDate);
      setTimesheetDates(dates);

      // Payroll figures (CTC, deductions, net pay) come from the real payroll
      // engine — never recomputed client-side — so exports match every other
      // screen exactly instead of drifting into their own, separately-buggy math.
      const [res, payrollList] = await Promise.all([
        api.getTimesheet({
          sourceId: activeSourceId !== 'all' ? activeSourceId : undefined,
          fromDate,
          toDate,
          search: searchQuery.trim() || undefined,
        }),
        api.getAllPayroll(toDate.slice(0, 7)).catch(() => [] as EmployeePayrollSummary[]),
      ]);

      setTimesheets(res.data);
      const payrollMap: Record<string, EmployeePayrollSummary> = {};
      for (const p of payrollList) payrollMap[p.empCode] = p;
      setPayrollSummaries(payrollMap);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load timesheet matrix');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRawPunches = async (page = rawPagination.page, limit = rawPagination.limit) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getAttendance({
        sourceId: activeSourceId !== 'all' ? activeSourceId : undefined,
        fromDate,
        toDate,
        search: searchQuery.trim() || undefined,
        machineId: machineId.trim() || undefined,
        page,
        limit,
      });

      setRawRecords(res.data);
      setRawPagination(res.pagination);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load raw punch records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyInOut(1, inOutPagination.limit);
    } else if (activeTab === 'timesheet') {
      fetchTimesheet();
    } else if (activeTab === 'raw') {
      fetchRawPunches(1, rawPagination.limit);
    }
  }, [activeTab, activeSourceId, fromDate, toDate, searchQuery, statusFilter, machineId]);

  const handleExportCSV = () => {
    if (activeTab === 'daily') {
      if (inOutRecords.length === 0) return;
      const headers = [
        'Employee Code',
        'Employee Name',
        'Location',
        'Date',
        'Check In',
        'Check Out',
        'Work Time',
        'Overtime',
        'Late In',
        'Status',
        'Remark',
      ];
      const rows = inOutRecords.map((r) => [
        `"${r.employeeCode}"`,
        `"${r.employeeName}"`,
        `"${r.sourceName}"`,
        `"${r.date}"`,
        `"${r.inTime}"`,
        `"${r.outTime}"`,
        `"${r.workTime}"`,
        `"${r.overTime}"`,
        `"${r.lateIn}"`,
        `"${r.statusLabel || r.status}"`,
        `"${r.remark}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ColorMyles_Attendance_${activeSourceId}_${fromDate}_to_${toDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (activeTab === 'timesheet') {
      if (timesheets.length === 0) return;
      const headers = ['Employee Code', 'Employee Name', 'Location', 'Present Days', 'Absent Days', 'Avg Hours/Day', ...timesheetDates];
      const rows = timesheets.map((t) => {
        const dayCols = timesheetDates.map((d) => {
          const day = t.days[d];
          return day ? `"${day.status} (${day.workTime})"` : '"-"';
        });
        return [
          `"${t.employeeCode}"`,
          `"${t.employeeName}"`,
          `"${t.sourceName}"`,
          `"${t.totalDaysPresent}"`,
          `"${t.totalDaysAbsent}"`,
          `"${t.avgHoursPerDay}"`,
          ...dayCols,
        ];
      });
      const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ColorMyles_Timesheet_${activeSourceId}_${fromDate}_to_${toDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
          onRefresh={() => (activeTab === 'daily' ? fetchDailyInOut(inOutPagination.page, inOutPagination.limit) : fetchTimesheet())}
          onSyncNow={() => onOpenSync(activeSourceId !== 'all' ? activeSourceId : undefined)}
          onExportCSV={handleExportCSV}
          isRefreshing={isLoading}
        />
      )}

      {error && (
        <ErrorAlert
          title="Error Loading Attendance"
          message={error}
          onRetry={() => (activeTab === 'daily' ? fetchDailyInOut() : activeTab === 'timesheet' ? fetchTimesheet() : fetchRawPunches())}
        />
      )}

      {/* Tab 1: Daily In/Out View */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          <AttendanceSummaryMetrics summary={inOutSummary} isLoading={isLoading} />
          <DailyAttendanceTable
            records={inOutRecords}
            pagination={inOutPagination}
            isLoading={isLoading}
            onPageChange={(p) => fetchDailyInOut(p, inOutPagination.limit)}
            onLimitChange={(l) => fetchDailyInOut(1, l)}
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

