import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildPaySheetCsv, buildPaySteps, extraPayOf, pendingForMonth, stepsNeedingAttention, summarizePay } from '../src/lib/payRun';
import type { AttendanceRegularizationRequest, EmployeePayrollSummary } from '../src/types';

const row = (over: Partial<EmployeePayrollSummary> = {}): EmployeePayrollSummary => ({
  empCode: 'E001', name: 'Asha One', monthDays: 30, payableDays: 29, lopDays: 1, grossSalary: 30000, monthlyCtc: 32000,
  netPayable: 25000, pfDeduction: 1800, esiDeduction: 0, ptDeduction: 200, ptDeductedFromNet: true, lopDeduction: 1000,
  otEarnings: 500, weeklyOffWorkEarnings: 0, holidayWorkEarnings: 0, totalDeductions: 3000, missedPunchDays: 0,
  payslip: { totalDeductions: 3000 },
  ...over,
} as unknown as EmployeePayrollSummary);

const req = (over: Partial<AttendanceRegularizationRequest>): AttendanceRegularizationRequest =>
  ({ id: '1', status: 'PENDING', date: '2026-10-05', ...over } as AttendanceRegularizationRequest);

describe('Pay Run totals', () => {
  test('only people with a salary are paid; the rest are counted separately', () => {
    const t = summarizePay([row(), row({ empCode: 'E002', netPayable: 15000, pfDeduction: 1000 }), row({ empCode: 'E003', monthlyCtc: 0, netPayable: 0 })]);
    assert.equal(t.paidPeople, 2);
    assert.equal(t.allPeople, 3);
    assert.equal(t.noSalaryPeople, 1);
    assert.equal(t.netPay, 40000);
    assert.equal(t.pf, 2800);
  });

  test('professional tax counts only when it is really cut from pay', () => {
    assert.equal(summarizePay([row({ ptDeductedFromNet: false })]).pt, 0);
    assert.equal(summarizePay([row({ ptDeductedFromNet: true })]).pt, 200);
  });

  test('extra pay adds overtime, weekly-off (both kinds) and holiday work', () => {
    assert.equal(extraPayOf(row({ otEarnings: 100, weeklyOffWorkEarnings: 200, weeklyOffNormalEarnings: 50, holidayWorkEarnings: 25 })), 375);
    assert.equal(extraPayOf(row({ otEarnings: 100, weeklyOffNormalEarnings: undefined })), 100);
  });
});

describe('Pay Run checklist', () => {
  const ok = { rows: [row()], missingDates: [] as string[], workingDays: 26, pendingRequests: 0 };

  test('a clean month has every check green and nothing needing attention', () => {
    const steps = buildPaySteps(ok);
    assert.deepEqual(steps.filter((s) => s.id !== 'overtime').map((s) => s.state), ['done', 'done', 'done', 'done']);
    assert.equal(stepsNeedingAttention(steps), 0);
  });

  test('missing attendance, waiting leave, one-punch days and no salary each raise a warning with a place to fix it', () => {
    const steps = buildPaySteps({
      rows: [row({ missedPunchDays: 2 }), row({ empCode: 'E009', monthlyCtc: 0 })],
      missingDates: ['2026-10-02', '2026-10-03'], workingDays: 26, pendingRequests: 3,
    });
    const by = Object.fromEntries(steps.map((s) => [s.id, s]));
    assert.equal(by.attendance.state, 'warn');
    assert.match(by.attendance.detail, /2 days/);
    assert.equal(by.leaves.state, 'warn');
    assert.match(by.leaves.detail, /3 leave requests/);
    assert.equal(by.leaves.to, '/approvals');
    assert.equal(by.punches.state, 'warn');
    assert.match(by.punches.detail, /1 person .* 2 days/);
    assert.equal(by.salary.state, 'warn');
    assert.match(by.salary.detail, /1 person has no salary/);
    assert.equal(by.salary.to, '/employees');
    assert.equal(stepsNeedingAttention(steps), 4);
  });

  test('people without a salary do not trigger the one-punch warning', () => {
    const steps = buildPaySteps({ ...ok, rows: [row({ monthlyCtc: 0, missedPunchDays: 5 })] });
    assert.equal(steps.find((s) => s.id === 'punches')!.state, 'done');
  });
});

describe('Pending leave in a month', () => {
  test('counts only waiting requests that touch the month, including ones that start earlier', () => {
    const list = [
      req({ id: 'a', date: '2026-10-05' }),
      req({ id: 'b', date: '2026-09-29', endDate: '2026-10-02' }),
      req({ id: 'c', date: '2026-11-01' }),
      req({ id: 'd', date: '2026-10-07', status: 'APPROVED' }),
    ];
    assert.equal(pendingForMonth(list, '2026-10'), 2);
  });
});

describe('Salary sheet CSV', () => {
  test('lists people with a salary, uses the engine figures, and ends with a total', () => {
    const csv = buildPaySheetCsv([row(), row({ empCode: 'E003', name: 'No Salary', monthlyCtc: 0 })], 'October 2026', true);
    const lines = csv.split('\r\n');
    assert.match(lines[0], /October 2026/);
    assert.match(lines[0], /Locked month/);
    assert.equal(lines.filter((l) => l.includes('Asha One')).length, 1);
    assert.ok(!csv.includes('No Salary'));
    assert.match(lines[lines.length - 1], /"Total people paid","1"/);
    assert.match(lines[lines.length - 1], /"25000"/);
  });

  test('a name starting with = cannot run as a spreadsheet formula', () => {
    const csv = buildPaySheetCsv([row({ name: '=HYPERLINK("http://x")' })], 'October 2026', false);
    assert.ok(csv.includes(`"'=HYPERLINK(""http://x"")"`));
    assert.match(csv, /Not locked yet/);
  });
});
