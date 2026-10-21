import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { buildPfWorkbook, PfExportRow } from '../src/lib/pfExport';

const row = (over: Partial<PfExportRow> = {}): PfExportRow => ({
  empCode: '024', name: 'Zakir Ahmed', location: 'budigere', uan: '101784996676', pfWages: 18757.13,
  employeePf: 2251, employerEpf: 689, employerEps: 1562, admin: 94, edli: 94, ...over,
});

describe('PF Excel export', () => {
  test('carries every figure and a remittance total per person and per column', async () => {
    const rows = [row(), row({ empCode: '045', name: 'Kenneti Devi', pfWages: 13254, employeePf: 1590, employerEpf: 486, employerEps: 1104, admin: 66, edli: 66 })];
    const wb = await buildPfWorkbook(rows, 'September 2026', '16/10/2026, 15:00:00');
    const back = new ExcelJS.Workbook();
    await back.xlsx.load((await wb.xlsx.writeBuffer()) as ArrayBuffer);
    const ws = back.worksheets[0];
    assert.equal(ws.name, 'PF September 2026');
    const headers = ws.getRow(4).values as unknown[];
    assert.ok(headers.includes('Employee PF (₹)') && headers.includes('Employer Pension (₹)') && headers.includes('Total to remit (₹)'));
    assert.equal(ws.getCell('B5').value, 'Zakir Ahmed');
    assert.equal(ws.getCell('F5').value, 2251);
    // per person: employee + employer EPF + pension + admin + EDLI
    assert.equal((ws.getCell('K5').value as { result: number }).result, 4690);
    const total = ws.getRow(7);
    assert.equal(total.getCell(1).value, 'TOTAL');
    assert.deepEqual(total.getCell(6).value as { formula: string; result: number }, { formula: 'SUM(F5:F6)', result: 3841 });
    assert.equal((total.getCell(11).value as { result: number }).result, 4690 + 3312);
  });

  test('an empty month still produces a valid file', async () => {
    const wb = await buildPfWorkbook([], 'October 2026', 'now');
    const back = new ExcelJS.Workbook();
    await back.xlsx.load((await wb.xlsx.writeBuffer()) as ArrayBuffer);
    assert.equal(back.worksheets[0].getRow(5).getCell(1).value, 'TOTAL');
  });
});
