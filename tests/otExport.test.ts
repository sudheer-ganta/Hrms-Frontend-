import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { buildOtWorkbook, hasOtActivity, otExcelFilename, OtExportRow } from '../src/lib/otExport';

const row = (over: Partial<OtExportRow> = {}): OtExportRow => ({
  empCode: '024', name: 'Zakir', location: 'budigere', perHourRate: 69.12, multiplier: 2, otHours: 15, otAmount: 2073.46,
  weeklyOffDays: 0, weeklyOffAmount: 0, holidayDays: 0, holidayAmount: 0, ...over,
});

describe('OT Excel export', () => {
  test('only people with OT or weekly-off / holiday work are listed', () => {
    assert.equal(hasOtActivity(row()), true);
    assert.equal(hasOtActivity(row({ otHours: 0, otAmount: 0, weeklyOffDays: 2, weeklyOffAmount: 2039.06 })), true);
    assert.equal(hasOtActivity(row({ otHours: 0, otAmount: 0 })), false);
  });

  test('the file opens, carries every figure, has live SUM totals, and no salary columns', async () => {
    const rows = [row(), row({ empCode: '045', name: 'Kenneti Devi', otHours: 1, otAmount: 127.44, weeklyOffDays: 2, weeklyOffAmount: 2039.06 })];
    const wb = await buildOtWorkbook(rows, 'September 2026', '16/10/2026, 15:00:00');
    const buf = await wb.xlsx.writeBuffer();
    const back = new ExcelJS.Workbook();
    await back.xlsx.load(buf as ArrayBuffer);
    const ws = back.worksheets[0];
    assert.equal(ws.name, 'OT September 2026');
    const headers = ws.getRow(4).values as unknown[];
    assert.ok(headers.includes('OT Hours') && headers.includes('OT Amount (₹)') && headers.includes('Total OT Payable (₹)'));
    assert.ok(!headers.some((h) => /CTC|Net|Deduction|Salary/i.test(String(h))), 'nothing salary-related in a file meant to be shared');
    assert.equal(ws.getCell('B5').value, 'Zakir');
    assert.equal(ws.getCell('F5').value, 15);
    assert.equal(ws.getCell('G6').value, 127.44);
    // totals row = last data row + 1, as SUM formulas
    const total = ws.getRow(7);
    assert.equal(total.getCell(1).value, 'TOTAL');
    assert.deepEqual((total.getCell(6).value as { formula: string; result: number }), { formula: 'SUM(F5:F6)', result: 16 });
    assert.equal((total.getCell(7).value as { result: number }).result, 2200.9);
    // per-employee payable = OT + weekly-off + holiday
    assert.equal((ws.getCell('L6').value as { result: number }).result, 2166.5);
    assert.equal((total.getCell(12).value as { result: number }).result, 4239.96);
  });

  test('an empty month still produces a valid file', async () => {
    const wb = await buildOtWorkbook([], 'October 2026', 'now');
    const back = new ExcelJS.Workbook();
    await back.xlsx.load((await wb.xlsx.writeBuffer()) as ArrayBuffer);
    assert.equal(back.worksheets[0].getRow(5).getCell(1).value, 'TOTAL');
  });

  test('filename carries the month', () => {
    assert.equal(otExcelFilename('2026-09'), 'ColorMyles_OT_Report_2026-09.xlsx');
  });
});
