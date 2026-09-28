import { EmployeeTimesheet, InOutRecord, EmployeePayrollSummary } from '../types';

/**
 * Cleanly escapes a string cell for CSV export
 */
const escapeCsv = (val: any): string => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

/**
 * Triggers a browser download of a CSV file with UTF-8 BOM for Excel compatibility
 */
export const downloadCsvFile = (content: string, filename: string): void => {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
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
 * Generates an Enterprise Payroll-Ready Attendance Matrix CSV.
 *
 * Every financial figure here (CTC, deductions, net pay) is taken directly from
 * the real payroll engine's output (`payrollSummaries`, from GET /api/payroll/all)
 * rather than recalculated in this file — a previous version of this export
 * duplicated the payroll math client-side, drifted out of sync with the real
 * engine, and fell back to a hardcoded ₹22,000 CTC for every employee whenever
 * profile data wasn't passed in (which was always, since no caller passed it).
 * Recomputing financial figures in more than one place is exactly how that kind
 * of silent, hard-to-spot bug happens — so this export now only ever displays
 * numbers the payroll engine actually produced.
 */
export const exportPayrollTimesheetCSV = (
  timesheets: EmployeeTimesheet[],
  days: string[],
  monthLabel: string = 'Current Month',
  payrollSummaries: Record<string, EmployeePayrollSummary> = {}
): void => {
  const rows: string[] = [];

  // 1. Company Header
  rows.push(['ColorMyles HRMS — Enterprise Attendance, Overtime & Salary Matrix'].map(escapeCsv).join(','));
  rows.push([`Payroll Month: ${monthLabel}`, `Generated At: ${new Date().toLocaleString()}`].map(escapeCsv).join(','));
  rows.push(''); // blank line

  // 2. Main Table Headers
  const headerCols = [
    'Emp Code',
    'Employee Name',
    'Date of Birth (DOB)',
    'Official Email',
    'Department',
    'Location',
    'Elapsed Days This Month',
    'Present Days',
    'Half Days (P/2)',
    'Absent Days',
    'Payable Days (Paid)',
    'LOP Days (Loss of Pay)',
    'Total Work Hours',
    'Base CTC (₹/month)',
    'PF Deduction (₹)',
    'PT Deduction (₹)',
    'LOP Deduction (₹)',
    'Net Pay So Far This Month (₹)',
    'Bank A/C',
    'Bank IFSC',
    // Dynamic day columns (01, 02, 03...)
    ...days.map((d) => `Day ${d.split('-')[2] || d}`),
  ];

  rows.push(headerCols.map(escapeCsv).join(','));

  // 3. Employee Rows
  timesheets.forEach((ts) => {
    const dayCells = days.map((day) => {
      const record = ts.days[day];
      if (!record) return '-';
      return record.status || (record.inTime !== '--:--' ? 'P' : 'A');
    });

    const ps = payrollSummaries[ts.employeeCode];
    const hasSalary = Boolean(ps && ps.monthlyCtc > 0);

    const row = [
      ts.employeeCode,
      ts.employeeName,
      ps?.dob || '',
      ps?.email || '',
      ps?.department || 'Operations',
      ts.sourceName,
      ps?.monthDays ?? '',
      ps?.presentDays ?? ts.totalDaysPresent,
      ps?.halfDays ?? '',
      ps?.absentDays ?? ts.totalDaysAbsent,
      ps?.payableDays ?? '',
      ps?.lopDays ?? '',
      ps?.totalWorkHours ?? Number((ts.totalWorkMinutes / 60).toFixed(1)),
      hasSalary ? ps!.monthlyCtc : 'Not Configured',
      hasSalary ? ps!.pfDeduction : '',
      hasSalary ? ps!.ptDeduction : '',
      hasSalary ? ps!.lopDeduction : '',
      hasSalary ? ps!.netPayable : '',
      ps?.bankAccount || '',
      ps?.ifscCode || '',
      ...dayCells,
    ];

    rows.push(row.map(escapeCsv).join(','));
  });

  const csvContent = rows.join('\r\n');
  const filename = `ColorMyles_Master_Payroll_${monthLabel.replace(/\s+/g, '_')}_${Date.now()}.csv`;
  downloadCsvFile(csvContent, filename);
};

/**
 * Generates Daily In/Out Attendance Detailed Log CSV
 */
export const exportDailyAttendanceCSV = (
  records: InOutRecord[],
  dateLabel: string = 'Daily Attendance'
): void => {
  const rows: string[] = [];

  rows.push(['ColorMyles HRMS — Daily In/Out Detailed Timesheet'].map(escapeCsv).join(','));
  rows.push([`Date / Filter: ${dateLabel}`, `Generated At: ${new Date().toLocaleString()}`].map(escapeCsv).join(','));
  rows.push('');

  const headers = [
    'Emp Code',
    'Employee Name',
    'Location',
    'Date',
    'In Time',
    'Out Time',
    'Work Duration',
    'Status',
    'Late In',
    'Early Out',
    'Overtime',
    'Remark',
  ];

  rows.push(headers.map(escapeCsv).join(','));

  records.forEach((r) => {
    const row = [
      r.employeeCode,
      r.employeeName,
      r.sourceName,
      r.date,
      r.inTime,
      r.outTime,
      r.workTime,
      r.status,
      r.lateIn,
      r.earlyOut,
      r.overTime,
      r.remark || '-',
    ];
    rows.push(row.map(escapeCsv).join(','));
  });

  const csvContent = rows.join('\r\n');
  const filename = `ColorMyles_Daily_Attendance_${dateLabel.replace(/[\s,]+/g, '_')}_${Date.now()}.csv`;
  downloadCsvFile(csvContent, filename);
};
