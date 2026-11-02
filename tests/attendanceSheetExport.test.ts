import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import type { AttendanceDay, RawPunch, TimesheetEmployee } from '../src/types';
import {
  attendanceSheetFilename, attendanceSheetName, buildAttendanceSheetWorkbook, DayPunches, groupPunches, sheetRangeLabel,
} from '../src/lib/attendanceSheetExport';

const day = (businessDate: string, over: Partial<AttendanceDay> = {}): AttendanceDay => ({
  employeeCode: '0023', employeeName: 'Balachander K', businessDate, siteId: 's1', siteName: 'Budigere',
  status: 'PRESENT', statusLabel: 'Present', firstIn: '10:50', lastOut: '21:02', workMinutes: 582, overtimeMinutes: 72,
  isLate: false, lateMinutes: 0, earlyCheckoutMinutes: 0, isWeeklyOff: false, isHoliday: false, isPaidHoliday: false,
  holidayName: null, offDayWorkFraction: 0, offDayWorkAsNormalDay: false, policyVersion: 1, vendorStatus: null,
  origins: ['BIOMETRIC'], sourceIds: [], manualOverride: false, adjustmentId: null, requestId: null, inProgress: false, ...over,
} as AttendanceDay);

const sheet = (code: string, name: string): TimesheetEmployee => ({
  employeeCode: code, employeeName: name, siteId: 's1', siteName: 'Budigere',
  days: {
    '2026-10-01': day('2026-10-01', { status: 'ABSENT', firstIn: null, lastOut: null, workMinutes: 0, overtimeMinutes: 0 }),
    '2026-10-02': day('2026-10-02'),
    '2026-10-03': day('2026-10-03', { status: 'WEEKLY_OFF', firstIn: null, lastOut: null, workMinutes: 0, overtimeMinutes: 0 }),
    '2026-10-04': day('2026-10-04', { status: 'HOLIDAY', firstIn: null, lastOut: null, workMinutes: 0, overtimeMinutes: 0 }),
    '2026-10-05': day('2026-10-05', { firstIn: '09:00', lastOut: null, workMinutes: 0, overtimeMinutes: 0, inProgress: true }),
  },
  totals: { presentDays: 2, halfDays: 0, leaveDays: 0, absentDays: 1, offDays: 2, missedPunchDays: 0, workMinutes: 582, overtimeMinutes: 72, lateDays: 0 },
});

const wholeOctober = Array.from({ length: 31 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
const load = async (sheets: TimesheetEmployee[], dates = wholeOctober, punches: DayPunches = {}) => {
  const wb = await buildAttendanceSheetWorkbook(sheets, dates, punches);
  const back = new ExcelJS.Workbook();
  await back.xlsx.load((await wb.xlsx.writeBuffer()) as ArrayBuffer);
  return back.worksheets[0];
};
const rowOf = (ws: ExcelJS.Worksheet, r: number, from = 1, to = 21) => Array.from({ length: to - from + 1 }, (_, i) => ws.getCell(r, from + i).value);

describe('Monthly In/Out attendance sheet (Excel)', () => {
  test('names say the month for a whole month, and the dates otherwise', () => {
    assert.equal(sheetRangeLabel(wholeOctober), 'October 2026');
    assert.equal(attendanceSheetName(wholeOctober), 'In-Out October 2026');
    assert.equal(attendanceSheetFilename(wholeOctober), 'ColorMyles_Month_InOut_October_2026.xlsx');
    const part = wholeOctober.slice(0, 15);
    assert.equal(attendanceSheetName(part), 'In-Out 01-10 to 15-10');
    assert.equal(attendanceSheetFilename(part), 'ColorMyles_Month_InOut_2026-10-01_to_2026-10-15.xlsx');
  });

  test('each employee block follows the time-office layout: title, month, employee, headers, one row per date, totals', async () => {
    const ws = await load([sheet('0265', 'Md Hasnain')]);
    assert.equal(ws.name, 'In-Out October 2026');
    assert.equal(ws.getCell('A1').value, 'Budigere');
    assert.equal(ws.getCell('A2').value, 'Dept. Name');
    assert.equal(ws.getCell('K2').value, 'Report Month:-');
    assert.equal(ws.getCell('O2').value, 'October-2026');
    assert.deepEqual([ws.getCell('A3').value, ws.getCell('B3').value, ws.getCell('H3').value, ws.getCell('J3').value], ['Empcode', '0265', 'Name', 'Md Hasnain']);
    assert.deepEqual(rowOf(ws, 4), ['Date', 'Status', 'IN', 'Out1', 'In2', 'Out2', 'In3', 'Out3', 'In4', 'Out4', 'In5', 'Out5', 'In6', 'Out6', 'In7', 'Out7', 'In8', 'Out', 'Work+OT', 'OT', 'Break']);
  });

  test('a date row carries IN, Out, Work+OT, OT and Break; empty days show --:--', async () => {
    const ws = await load([sheet('0265', 'Md Hasnain')]);
    // 01/10 absent
    assert.deepEqual([1, 2, 3, 18, 19, 20, 21].map((c) => ws.getCell(5, c).value), ['01/10/2026', 'A', '--:--', '--:--', '00:00', '00:00', '00:00']);
    // 02/10 present: 10:50 to 21:02 is 10:12, work 09:42, so the break is 00:30
    assert.deepEqual([1, 2, 3, 18, 19, 20, 21].map((c) => ws.getCell(6, c).value), ['02/10/2026', 'P', '10:50', '21:02', '09:42', '01:12', '00:30']);
    assert.equal(ws.getCell(7, 2).value, 'WO');
    assert.equal(ws.getCell(8, 2).value, 'HL');
    // checked in, not out yet
    assert.deepEqual([2, 3, 18].map((c) => ws.getCell(9, c).value), ['IN', '09:00', '--:--']);
    // a date with no record at all
    assert.equal(ws.getCell(10, 2).value, '');
    assert.equal(ws.getCell(10, 3).value, '--:--');
  });

  test('the totals lines match the time-office report', async () => {
    const ws = await load([sheet('0265', 'Md Hasnain')]);
    const totals = ws.getCell('A36').value as { richText: { text: string; font?: { bold?: boolean } }[] };
    assert.equal(totals.richText.map((x) => x.text).join(''), 'Total Work+OT Hrs:-  09:42      Total OT Hrs:-  01:12      Total Break Hrs:-  00:30');
    assert.equal(totals.richText[0].font?.bold, true, 'the label is bold, the figure is not');
    assert.ok(!totals.richText[1].font?.bold);
    assert.deepEqual([ws.getCell('A37').value, ws.getCell('B37').value, ws.getCell('E37').value, ws.getCell('H37').value, ws.getCell('L37').value, ws.getCell('N37').value], ['Total Pr.', 2, 'Total WO', 1, 'Tot. Ab', 1]);
    assert.deepEqual([ws.getCell('A38').value, ws.getCell('B38').value, ws.getCell('E38').value, ws.getCell('H38').value], ['Total HL', 1, 'Total Leave', 0]);
  });

  test('the next employee starts after a blank row, and nothing about salary is in the file', async () => {
    const ws = await load([sheet('0265', 'Md Hasnain'), sheet('0266', 'Asha One')]);
    assert.equal(ws.getCell('A39').value, null);
    assert.equal(ws.getCell('A40').value, 'Budigere');
    assert.equal(ws.getCell('J42').value, 'Asha One');
    let text = '';
    ws.eachRow((row) => row.eachCell((cell) => { text += ` ${String(cell.value)}`; }));
    assert.ok(!/CTC|salary|net pay|deduction|PF|ESI/i.test(text));
  });

  test('punches between the first IN and the last Out fill Out1, In2, Out2 … and never repeat IN or Out', async () => {
    const raw = (empCode: string, entryDate: string, entryTime: string) => ({ employeeCode: empCode, entryDate, entryTime } as RawPunch);
    const punches = groupPunches([
      raw('0265', '2026-10-02', '21:02:10'), raw('0265', '2026-10-02', '10:50:05'), raw('0265', '2026-10-02', '12:32:00'),
      raw('0265', '2026-10-02', '12:32:40'), // the machine logged the same minute twice
      raw('0265', '2026-10-02', '14:03:00'), raw('0265', '2026-10-02', '16:00:00'), raw('0265', '2026-10-02', '16:20:00'),
      raw('0999', '2026-10-02', '13:00:00'), // someone else
    ]);
    assert.deepEqual(punches['0265']['2026-10-02'], ['10:50', '12:32', '14:03', '16:00', '16:20', '21:02']);
    const ws = await load([sheet('0265', 'Md Hasnain')], wholeOctober, punches);
    // 02/10: IN 10:50, Out1 12:32, In2 14:03, Out2 16:00, In3 16:20, then nothing, Out 21:02
    assert.deepEqual([3, 4, 5, 6, 7, 8, 9, 18].map((c) => ws.getCell(6, c).value), ['10:50', '12:32', '14:03', '16:00', '16:20', null, null, '21:02']);
    // days without extra punches keep the middle columns empty
    assert.deepEqual([4, 5, 6].map((c) => ws.getCell(5, c).value), [null, null, null]);
  });
});
