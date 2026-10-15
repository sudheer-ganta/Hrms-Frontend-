import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { AxiosError } from 'axios';

import { addDays, businessDateFromInstant, daysInMonth, istMonth, istToday, weekdayIndexMonFirst, monthOptions, formatBusinessDate } from '../src/lib/businessDate';
import { normalizeError, errorMessage } from '../src/lib/apiError';
import { STATUS_META, metaFor, formatMinutes } from '../src/lib/attendanceDisplay';
import { ATTENDANCE_STATUSES } from '../src/types';
import type { EmployeePayrollSummary } from '../src/types';
import { buildSlipView, dotDate, periodLabel, shortMonth } from '../src/lib/payslipLayout';

describe('IST business-date helpers (browser timezone independent)', () => {
  test('00:30 IST on the 1st is still the 1st, not the previous UTC day', () => {
    // 2026-09-30T19:00Z === 2026-10-01 00:30 IST
    const instant = new Date('2026-09-30T19:00:00Z');
    assert.equal(istToday(instant), '2026-10-01');
    assert.equal(istMonth(instant), '2026-10');
    // new Date().toISOString().slice(0,10) would have said 2026-09-30
    assert.equal(instant.toISOString().slice(0, 10), '2026-09-30');
  });
  test('date arithmetic is pure string/UTC arithmetic', () => {
    assert.equal(addDays('2026-02-28', 1), '2026-03-01');
    assert.equal(addDays('2026-01-01', -1), '2025-12-31');
    assert.equal(daysInMonth('2026-02').length, 28);
    assert.equal(weekdayIndexMonFirst('2026-10-05'), 0); // Monday
    assert.equal(weekdayIndexMonFirst('2026-10-11'), 6); // Sunday
    assert.equal(businessDateFromInstant(new Date('2026-10-07T20:00:00Z')), '2026-10-08');
    assert.deepEqual(monthOptions(3, '2026-01'), ['2026-01', '2025-12', '2025-11']);
    assert.equal(formatBusinessDate('2026-10-08'), '08 Oct 2026');
  });
});

describe('error contract', () => {
  const axiosErr = (status: number, data: unknown) =>
    new AxiosError('boom', 'ERR_BAD_REQUEST', undefined, undefined, { status, data, statusText: '', headers: {}, config: {} as never });

  test('reads the canonical backend error body', () => {
    const e = axiosErr(422, { success: false, error: { code: 'BUSINESS_RULE', message: 'Payroll for 2026-09 is CLOSED.' } });
    const n = normalizeError(e);
    assert.equal(n.code, 'BUSINESS_RULE');
    assert.equal(n.status, 422);
    assert.equal(errorMessage(e), 'Payroll for 2026-09 is CLOSED.');
  });
  test('validation details are surfaced', () => {
    const e = axiosErr(400, { success: false, error: { code: 'VALIDATION_ERROR', message: 'Month must be YYYY-MM.', details: [{ field: 'month', issue: 'Invalid format' }] } });
    assert.match(errorMessage(e), /month: Invalid format/);
  });
  test('network failures do not masquerade as server errors', () => {
    const e = new AxiosError('Network Error', 'ERR_NETWORK');
    assert.equal(normalizeError(e).code, 'NETWORK');
  });
  test('old {message} shaped bodies no longer produce a misleading message', () => {
    const e = axiosErr(500, { success: false, message: 'legacy' });
    assert.equal(normalizeError(e).code, 'UNKNOWN');
  });
});

describe('attendance display', () => {
  test('every canonical status has display metadata (no status can render blank or as Absent by accident)', () => {
    for (const s of ATTENDANCE_STATUSES) {
      assert.ok(STATUS_META[s], s);
      assert.ok(STATUS_META[s].label.length > 0);
    }
    assert.notEqual(STATUS_META.LEAVE_PAID.label, STATUS_META.ABSENT.label);
    assert.notEqual(metaFor('LEAVE_PAID').cell, metaFor('ABSENT').cell);
    assert.equal(metaFor(null).label, 'Upcoming');
  });
  test('legacy vendor codes are not display keys any more', () => {
    for (const legacy of ['P', 'P/2', 'A', 'W', 'WO', 'H', 'HL', 'L', 'PL', 'CL']) {
      assert.ok(!(legacy in STATUS_META), legacy);
    }
  });
  test('minutes formatting', () => {
    assert.equal(formatMinutes(510), '08:30');
    assert.equal(formatMinutes(0), '00:00');
    assert.equal(formatMinutes(null), '00:00');
  });
});

describe('cross-repo contract (runs when the backend checkout sits next to the frontend)', () => {
  const backend = path.resolve(process.cwd(), '..', 'Hrms-Backend', 'src');
  const skip = !fs.existsSync(path.join(backend, 'modules', 'attendance', 'attendanceStatus.ts')) && 'backend repo not found next to the frontend';

  const listFrom = (file: string, constName: string): string[] => {
    const src = fs.readFileSync(file, 'utf-8');
    const m = src.match(new RegExp(`${constName}\\s*=\\s*\\[([^\\]]+)\\]`));
    assert.ok(m, `${constName} not found in ${file}`);
    return [...m![1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  };

  test('AttendanceStatus enum is identical', { skip }, () => {
    const be = listFrom(path.join(backend, 'modules', 'attendance', 'attendanceStatus.ts'), 'ATTENDANCE_STATUSES');
    assert.deepEqual([...ATTENDANCE_STATUSES], be);
  });
  test('Request status and type enums are identical', { skip }, () => {
    const f = path.join(backend, 'modules', 'requests', 'requests.types.ts');
    const types = fs.readFileSync(path.resolve(process.cwd(), 'src', 'types', 'index.ts'), 'utf-8');
    for (const s of listFrom(f, 'REQUEST_STATUSES')) assert.ok(types.includes(`'${s}'`), `frontend RequestStatus misses ${s}`);
    for (const s of listFrom(f, 'REQUEST_TYPES')) assert.ok(types.includes(`'${s}'`), `frontend RequestType misses ${s}`);
    for (const s of listFrom(f, 'LEAVE_TYPES')) assert.ok(types.includes(`'${s}'`), `frontend LeaveType misses ${s}`);
  });
  test('API error codes are identical', { skip }, () => {
    const src = fs.readFileSync(path.join(backend, 'utils', 'apiError.ts'), 'utf-8');
    const be = [...src.match(/export type ApiErrorCode =([^;]+);/)![1].matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]).sort();
    const fe = [...fs.readFileSync(path.resolve(process.cwd(), 'src', 'types', 'index.ts'), 'utf-8').match(/export type ApiErrorCode =([^;]+);/)![1].matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]).sort();
    assert.deepEqual(fe, be);
  });
  test('payroll summary DTO fields match', { skip }, () => {
    const beSrc = fs.readFileSync(path.join(backend, 'modules', 'payroll', 'payroll.types.ts'), 'utf-8');
    const fields = (src: string, iface: string) => {
      const body = src.match(new RegExp(`export interface ${iface} \\{([\\s\\S]*?)\\n\\}`))![1];
      return [...body.matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1]).sort();
    };
    const feSrc = fs.readFileSync(path.resolve(process.cwd(), 'src', 'types', 'index.ts'), 'utf-8');
    assert.deepEqual(fields(feSrc, 'EmployeePayrollSummary'), fields(beSrc, 'EmployeePayrollSummary'));
    assert.deepEqual(fields(feSrc, 'PayslipBreakdown'), fields(beSrc, 'PayslipBreakdown'));
  });
});

describe('payslip layout (display only)', () => {
  const summary = {
    month: '2026-09', grossSalary: 28000, basicSalary: 12174, da: 2826, hra: 6000, allowances: 0, otherAllowance: 7000,
    payslip: {
      earnings: [
        { code: 'BASIC', label: 'Basic', amount: 12174 }, { code: 'DA', label: 'Dearness Allowance', amount: 2826 },
        { code: 'HRA', label: 'HRA', amount: 6000 }, { code: 'SPECIAL', label: 'Special Allowance', amount: 0 },
        { code: 'OTHER', label: 'Other Allowance', amount: 7000 },
        { code: 'WEEKLY_OFF_WORK', label: 'Weekly-off Working', amount: 1000, note: '1 day(s) @ 2x' },
        { code: 'OT', label: 'Overtime', amount: 500, note: '2h @ 250/h' },
      ],
      deductions: [
        { code: 'LOP', label: 'Loss of Pay', amount: 900 }, { code: 'PF', label: 'Employee PF', amount: 2192 },
        { code: 'PT', label: 'Professional Tax', amount: 200 },
      ],
      employerBorne: [], totalEarnings: 29500, totalDeductions: 3292, netPay: 26208,
    },
  } as unknown as EmployeePayrollSummary;

  test('amounts land under the template headings and every backend line stays visible', () => {
    const v = buildSlipView(summary);
    const earn = Object.fromEntries(v.earnings.map((r) => [r.label, r]));
    assert.equal(earn['Basic Pay'].amount, 12174);
    assert.equal(earn['VDA'].amount, 2826);
    assert.equal(earn['Sunday working Allowance'].amount, 1000);
    assert.equal(earn['incentive for Sep_26'].amount, 0);
    assert.ok(v.earnings.some((r) => r.label.startsWith('Overtime')), 'a line with no heading is appended, not dropped');
    assert.ok(v.deductions.some((r) => r.label.startsWith('Loss of Pay')));
    assert.equal(v.deductions.find((r) => r.label === 'PF')!.amount, 2192);
  });

  test('the displayed columns foot to the backend totals (nothing is recomputed in the UI)', () => {
    const v = buildSlipView(summary);
    const sum = (rows: { amount: number }[]) => Math.round(rows.reduce((a, r) => a + r.amount, 0) * 100) / 100;
    assert.equal(sum(v.earnings), v.totalEarnings);
    assert.equal(sum(v.deductions), v.totalDeductions);
    assert.equal(v.totalEarnings - v.totalDeductions, v.netPay);
  });

  test('template date and period formats', () => {
    assert.equal(dotDate('2026-09-01'), '01.09.2026');
    assert.equal(dotDate(undefined), '');
    assert.equal(periodLabel('2026-09'), 'Sep- 2026');
    assert.equal(shortMonth('2026-09'), 'Sep_26');
  });
});
