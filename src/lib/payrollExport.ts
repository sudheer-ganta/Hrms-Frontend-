import type { AttendanceDay, EmployeePayrollSummary, TimesheetEmployee } from '../types';
import { formatMinutes, STATUS_META } from './attendanceDisplay';

/** Cleanly escapes a string cell for CSV export (also neutralises spreadsheet formula injection). */
const escapeCsv = (val: unknown): string => {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (/^[=+\-@\t\r]/.test(str) && Number.isNaN(Number(str))) str = `'${str}`;
  return `"${str.replace(/"/g, '""')}"`;
};

/** Triggers a browser download of a CSV file with a UTF-8 BOM for Excel compatibility. */
export const downloadCsvFile = (content: string, filename: string): void => {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Payroll-ready attendance matrix.
 *
 * EVERY figure (attendance days, CTC, deductions, net pay) is taken verbatim from the backend:
 * the per-day cells from the attendance resolver, the money from the payroll engine
 * (`payrollSummaries`). Nothing is recalculated or defaulted here, so the export always agrees with
 * the screens and the payslips.
 */
export const buildPayrollTimesheetCsv = (
  timesheets: TimesheetEmployee[],
  days: string[],
  monthLabel: string = 'Selected Range',
  payrollSummaries: Record<string, EmployeePayrollSummary> = {},
  generatedAt: string = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })
): string => {
  const rows: string[] = [];
  rows.push(['ColorMyles HRMS: Attendance, Overtime & Salary Matrix'].map(escapeCsv).join(','));
  rows.push([`Range: ${monthLabel}`, `Generated At: ${generatedAt} IST`].map(escapeCsv).join(','));
  rows.push('');

  const headerCols = [
    'Emp Code', 'Employee Name', 'Date of Birth', 'Official Email', 'Department', 'Location',
    'Payroll Month', 'Payroll Status',
    'Present Days', 'Half Days', 'Paid Leave Days', 'Absent Days', 'Weekly Offs', 'Holidays', 'Payable Days', 'LOP Days',
    'Total Work Hours', 'OT Hours', 'Weekly-off Work Days', 'Holiday Work Days', 'Weekly-off Work Pay', 'Holiday Work Pay',
    'Monthly CTC', 'Gross Earnings', 'PF Deduction', 'ESIC Deduction', 'LOP Deduction', 'Total Deductions', 'Net Pay',
    'Bank A/C', 'Bank IFSC',
    ...days.map((d) => `Day ${d.split('-')[2] || d}`),
  ];
  rows.push(headerCols.map(escapeCsv).join(','));

  timesheets.forEach((ts) => {
    const ps = payrollSummaries[ts.employeeCode];
    const hasSalary = !!ps && ps.monthlyCtc > 0;
    const dayCells = days.map((d) => ts.days[d]?.statusLabel ?? '-');
    const row = [
      ts.employeeCode, ts.employeeName, ps?.dob ?? '', ps?.email ?? '', ps?.department ?? '', ts.siteName ?? '',
      ps?.month ?? '', ps ? (ps.isProvisional ? 'Provisional' : `Closed v${ps.snapshotVersion ?? ''}`) : '',
      ps?.presentDays ?? ts.totals.presentDays, ps?.halfDays ?? ts.totals.halfDays, ps?.leaveDays ?? ts.totals.leaveDays,
      ps?.absentDays ?? ts.totals.absentDays, ps?.weeklyOffs ?? '', ps?.holidays ?? '', ps?.payableDays ?? '', ps?.lopDays ?? '',
      ps?.totalWorkHours ?? Number((ts.totals.workMinutes / 60).toFixed(1)), ps?.totalOtHours ?? Number((ts.totals.overtimeMinutes / 60).toFixed(1)),
      ps?.weeklyOffWorkDays ?? '', ps?.holidayWorkDays ?? '', hasSalary ? ps!.weeklyOffWorkEarnings : '', hasSalary ? ps!.holidayWorkEarnings : '',
      hasSalary ? ps!.monthlyCtc : 'Not Configured',
      hasSalary ? ps!.grossEarnings : '', hasSalary ? ps!.pfDeduction : '', hasSalary ? ps!.esiDeduction : '',
      hasSalary ? ps!.lopDeduction : '', hasSalary ? ps!.payslip.totalDeductions : '', hasSalary ? ps!.netPayable : '',
      ps?.bankAccount ?? '', ps?.ifscCode ?? '',
      ...dayCells,
    ];
    rows.push(row.map(escapeCsv).join(','));
  });

  return rows.join('\r\n');
};

export const exportPayrollTimesheetCSV = (
  timesheets: TimesheetEmployee[],
  days: string[],
  monthLabel: string = 'Selected Range',
  payrollSummaries: Record<string, EmployeePayrollSummary> = {}
): void => {
  downloadCsvFile(buildPayrollTimesheetCsv(timesheets, days, monthLabel, payrollSummaries), `ColorMyles_Master_Payroll_${monthLabel.replace(/\s+/g, '_')}_${Date.now()}.csv`);
};

/** Daily attendance detail (one row per employee-day, backend verdicts). */
export const exportDailyAttendanceCSV = (records: AttendanceDay[], dateLabel: string = 'Daily Attendance'): void => {
  const rows: string[] = [];
  rows.push(['ColorMyles HRMS: Daily Attendance Detail'].map(escapeCsv).join(','));
  rows.push([`Filter: ${dateLabel}`, `Generated At: ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })} IST`].map(escapeCsv).join(','));
  rows.push('');
  rows.push(['Emp Code', 'Employee Name', 'Location', 'Date', 'In', 'Out', 'Work Duration', 'Status', 'Late (min)', 'Overtime', 'Source'].map(escapeCsv).join(','));
  records.forEach((r) => {
    rows.push(
      [
        r.employeeCode, r.employeeName, r.siteName ?? '', r.businessDate, r.firstIn ?? '', r.lastOut ?? '', formatMinutes(r.workMinutes),
        r.status ? STATUS_META[r.status].label : 'Upcoming', r.isLate ? r.lateMinutes : 0, formatMinutes(r.overtimeMinutes),
        r.manualOverride ? 'Approved request' : r.origins.join('+'),
      ].map(escapeCsv).join(',')
    );
  });
  downloadCsvFile(rows.join('\r\n'), `ColorMyles_Daily_Attendance_${dateLabel.replace(/[\s,]+/g, '_')}_${Date.now()}.csv`);
};
