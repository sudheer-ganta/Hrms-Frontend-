import type { AttendanceRegularizationRequest, EmployeePayrollSummary } from '../types';

/**
 * Pay Run checklist: turns what the backend already reports for a month into plain "do this next" steps.
 * It only COUNTS and LISTS. Every rupee comes from the payroll engine (`EmployeePayrollSummary`), nothing is recalculated here.
 */

export type StepState = 'done' | 'warn' | 'info';

export interface PayStep {
  id: 'attendance' | 'leaves' | 'punches' | 'salary' | 'overtime';
  title: string;
  /** One plain sentence saying what is true right now. */
  detail: string;
  state: StepState;
  /** Where to go to fix it (an app route). */
  to?: string;
  actionLabel?: string;
}

export interface PayTotals {
  /** People whose salary is set up (they are the ones paid). */
  paidPeople: number;
  /** Everyone in the month's payroll, including people with no salary set. */
  allPeople: number;
  noSalaryPeople: number;
  netPay: number;
  pf: number;
  esi: number;
  /** Professional tax actually cut from pay. */
  pt: number;
  /** Overtime + weekly-off + holiday working pay. */
  extraPay: number;
}

const hasSalary = (r: EmployeePayrollSummary): boolean => r.monthlyCtc > 0;

/** Extra pay for working beyond a normal day: overtime plus weekly-off / holiday work. */
export const extraPayOf = (r: EmployeePayrollSummary): number =>
  (r.otEarnings || 0) + (r.weeklyOffWorkEarnings || 0) + (r.weeklyOffNormalEarnings ?? 0) + (r.holidayWorkEarnings || 0);

export const summarizePay = (rows: EmployeePayrollSummary[]): PayTotals => {
  const paid = rows.filter(hasSalary);
  return {
    paidPeople: paid.length,
    allPeople: rows.length,
    noSalaryPeople: rows.length - paid.length,
    netPay: paid.reduce((s, r) => s + (r.netPayable || 0), 0),
    pf: paid.reduce((s, r) => s + (r.pfDeduction || 0), 0),
    esi: paid.reduce((s, r) => s + (r.esiDeduction || 0), 0),
    pt: paid.reduce((s, r) => s + (r.ptDeductedFromNet ? r.ptDeduction || 0 : 0), 0),
    extraPay: paid.reduce((s, r) => s + extraPayOf(r), 0),
  };
};

/** A request that still needs an answer and touches this month. */
export const pendingForMonth = (requests: AttendanceRegularizationRequest[], month: string): number =>
  requests.filter((q) => q.status === 'PENDING' && (q.date.slice(0, 7) === month || (q.endDate ?? q.date).slice(0, 7) === month)).length;

const plural = (n: number, one: string, many: string = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export interface PayRunInputs {
  rows: EmployeePayrollSummary[];
  /** Working days with no stored attendance for anyone (from /payroll/runs/:month/coverage). */
  missingDates: string[];
  workingDays: number;
  pendingRequests: number;
}

export const buildPaySteps = ({ rows, missingDates, workingDays, pendingRequests }: PayRunInputs): PayStep[] => {
  const totals = summarizePay(rows);
  const onePunch = rows.filter((r) => hasSalary(r) && (r.missedPunchDays || 0) > 0);
  const onePunchDays = onePunch.reduce((s, r) => s + (r.missedPunchDays || 0), 0);
  const extraPeople = rows.filter((r) => hasSalary(r) && extraPayOf(r) > 0).length;

  return [
    missingDates.length > 0
      ? {
          id: 'attendance', state: 'warn', title: 'Attendance is complete',
          detail: `No attendance is saved for ${plural(missingDates.length, 'day')} (${missingDates.slice(0, 4).join(', ')}${missingDates.length > 4 ? ', …' : ''}) out of ${workingDays} working days. Everyone would lose pay for them. Update attendance from the machines first.`,
          to: '/attendance', actionLabel: 'Open Attendance',
        }
      : { id: 'attendance', state: 'done', title: 'Attendance is complete', detail: `Attendance is saved for all ${workingDays} working days so far.` },
    pendingRequests > 0
      ? {
          id: 'leaves', state: 'warn', title: 'Leave requests are answered',
          detail: `${plural(pendingRequests, 'leave request')} still waiting for a Yes or No. A leave that is not approved is counted as absent.`,
          to: '/approvals', actionLabel: 'Answer requests',
        }
      : { id: 'leaves', state: 'done', title: 'Leave requests are answered', detail: 'No leave request is waiting.' },
    onePunch.length > 0
      ? {
          id: 'punches', state: 'warn', title: 'Days with only one punch are checked',
          detail: `${plural(onePunch.length, 'person', 'people')} forgot a punch on ${plural(onePunchDays, 'day')}. These days are paid as full days. Check they are correct.`,
          to: '/attendance', actionLabel: 'Open Attendance',
        }
      : { id: 'punches', state: 'done', title: 'Days with only one punch are checked', detail: 'Nobody has a day with a missing punch.' },
    totals.noSalaryPeople > 0
      ? {
          id: 'salary', state: 'warn', title: 'Salary is set for everyone',
          detail: `${plural(totals.noSalaryPeople, 'person', 'people')} ${totals.noSalaryPeople === 1 ? 'has' : 'have'} no salary set and will get ₹0. If they should be paid, add their salary first.`,
          to: '/employees', actionLabel: 'Set salaries',
        }
      : { id: 'salary', state: 'done', title: 'Salary is set for everyone', detail: `All ${totals.allPeople} people have a salary.` },
    {
      id: 'overtime', state: 'info', title: 'Overtime and extra pay',
      detail: extraPeople > 0
        ? `${plural(extraPeople, 'person', 'people')} will get overtime or weekly-off pay. You can also type advances, deductions and bonus here.`
        : 'No overtime this month. You can still type advances, deductions and bonus here.',
      to: '/ot-calculator', actionLabel: 'Open Overtime Pay',
    },
  ];
};

/** How many steps still need a look (drives the "x things to check" hint on the lock button). */
export const stepsNeedingAttention = (steps: PayStep[]): number => steps.filter((s) => s.state === 'warn').length;

// ---------------------------------------------------------------- salary sheet

const csvCell = (val: unknown): string => {
  if (val === null || val === undefined) return '""';
  let s = String(val);
  // A leading = + - @ would run as a spreadsheet formula; names and codes come from people, so neutralise it.
  if (/^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/** One-page salary sheet for the month: one row per person who has a salary. Figures are the engine's, verbatim. */
export const buildPaySheetCsv = (rows: EmployeePayrollSummary[], monthText: string, locked: boolean): string => {
  const head = ['Emp Code', 'Name', 'Department', 'Days in month', 'Days paid', 'Days lost (LOP)', 'Monthly salary', 'Overtime & extra pay', 'Loss of pay cut', 'PF', 'ESI', 'Professional tax', 'Advance / other cuts', 'Bonus / extras', 'Total cuts', 'Pay to bank', 'Bank A/C', 'IFSC'];
  const out: string[] = [
    [`ColorMyles salary sheet: ${monthText}`, locked ? 'Locked month' : 'Not locked yet (can still change)'].map(csvCell).join(','),
    '',
    head.map(csvCell).join(','),
  ];
  for (const r of rows.filter(hasSalary)) {
    const pt = r.ptDeductedFromNet ? r.ptDeduction || 0 : 0;
    const other = (r.salaryAdvance || 0) + (r.otherDeduction || 0) + (r.lwfDeduction || 0);
    out.push([
      r.empCode, r.name, r.department ?? '', r.monthDays, r.payableDays, r.lopDays, r.grossSalary, extraPayOf(r), r.lopDeduction,
      r.pfDeduction, r.esiDeduction, pt, other, (r.attendanceBonus || 0) + (r.incrementAmount || 0), r.payslip?.totalDeductions ?? r.totalDeductions,
      r.netPayable, r.bankAccount ?? '', r.ifscCode ?? '',
    ].map(csvCell).join(','));
  }
  const t = summarizePay(rows);
  out.push('', ['Total people paid', t.paidPeople, '', '', '', '', '', t.extraPay, '', t.pf, t.esi, t.pt, '', '', '', t.netPay].map(csvCell).join(','));
  return out.join('\r\n');
};
