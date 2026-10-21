import type { Workbook } from 'exceljs';

/**
 * One month of overtime as an Excel file that can be sent to others.
 * Every figure is taken verbatim from the backend payroll engine (the same numbers the OT Calculator shows);
 * nothing is recalculated here except the column totals, which are live Excel SUM formulas.
 * Salary figures (CTC, net pay, deductions) are deliberately NOT included: this file is meant to be shared.
 */
export interface OtExportRow {
  empCode: string;
  name: string;
  location: string;
  perHourRate: number;
  multiplier: number;
  otHours: number;
  otAmount: number;
  weeklyOffDays: number;
  weeklyOffAmount: number;
  holidayDays: number;
  holidayAmount: number;
}

/** True when the employee has anything to report: overtime hours or pay for a weekly off / holiday worked. */
export const hasOtActivity = (r: OtExportRow): boolean =>
  r.otHours > 0 || r.otAmount > 0 || r.weeklyOffDays > 0 || r.weeklyOffAmount > 0 || r.holidayDays > 0 || r.holidayAmount > 0;

const COLUMNS: { header: string; key: keyof OtExportRow; width: number; fmt?: string; total?: boolean }[] = [
  { header: 'Emp Code', key: 'empCode', width: 11 },
  { header: 'Employee Name', key: 'name', width: 26 },
  { header: 'Location', key: 'location', width: 14 },
  { header: 'Per Hour Rate (₹)', key: 'perHourRate', width: 17, fmt: '#,##0.00' },
  { header: 'Multiplier', key: 'multiplier', width: 11, fmt: '0.0"x"' },
  { header: 'OT Hours', key: 'otHours', width: 11, fmt: '0.00', total: true },
  { header: 'OT Amount (₹)', key: 'otAmount', width: 15, fmt: '#,##0.00', total: true },
  { header: 'Weekly-off Days Worked', key: 'weeklyOffDays', width: 14, fmt: '0.0', total: true },
  { header: 'Weekly-off Amount (₹)', key: 'weeklyOffAmount', width: 17, fmt: '#,##0.00', total: true },
  { header: 'Holiday Days Worked', key: 'holidayDays', width: 14, fmt: '0.0', total: true },
  { header: 'Holiday Amount (₹)', key: 'holidayAmount', width: 17, fmt: '#,##0.00', total: true },
];

const TOTAL_PAYABLE_HEADER = 'Total OT Payable (₹)';

/** Builds the workbook. exceljs is loaded on demand so it never weighs down the rest of the app. */
export const buildOtWorkbook = async (rows: OtExportRow[], monthLabel: string, generatedAt: string): Promise<Workbook> => {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ColorMyles HRMS';
  const ws = wb.addWorksheet(`OT ${monthLabel}`.slice(0, 31), { views: [{ state: 'frozen', ySplit: 4, xSplit: 2 }] });
  const lastCol = COLUMNS.length + 1; // + Total OT Payable

  ws.mergeCells(1, 1, 1, lastCol);
  ws.getCell(1, 1).value = `ColorMyles: Overtime Report, ${monthLabel}`;
  ws.getCell(1, 1).font = { bold: true, size: 14 };
  ws.mergeCells(2, 1, 2, lastCol);
  ws.getCell(2, 1).value = `Generated ${generatedAt} IST · ${rows.length} employee(s) with overtime or weekly-off / holiday work`;
  ws.getCell(2, 1).font = { italic: true, color: { argb: 'FF64748B' } };

  const headerRow = ws.getRow(4);
  [...COLUMNS.map((c) => c.header), TOTAL_PAYABLE_HEADER].forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.alignment = { vertical: 'middle', horizontal: i < 3 ? 'left' : 'right', wrapText: true };
  });
  headerRow.height = 34;
  COLUMNS.forEach((c, i) => { ws.getColumn(i + 1).width = c.width; });
  ws.getColumn(lastCol).width = 18;

  const colLetter = (n: number) => ws.getColumn(n).letter;
  const otAmountCol = COLUMNS.findIndex((c) => c.key === 'otAmount') + 1;
  const weeklyOffAmountCol = COLUMNS.findIndex((c) => c.key === 'weeklyOffAmount') + 1;
  const holidayAmountCol = COLUMNS.findIndex((c) => c.key === 'holidayAmount') + 1;

  rows.forEach((r, idx) => {
    const rowNo = 5 + idx;
    const row = ws.getRow(rowNo);
    COLUMNS.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      cell.value = r[c.key] as string | number;
      if (c.fmt) cell.numFmt = c.fmt;
      if (i >= 3) cell.alignment = { horizontal: 'right' };
    });
    const payable = row.getCell(lastCol);
    const result = Math.round((r.otAmount + r.weeklyOffAmount + r.holidayAmount) * 100) / 100;
    payable.value = { formula: `${colLetter(otAmountCol)}${rowNo}+${colLetter(weeklyOffAmountCol)}${rowNo}+${colLetter(holidayAmountCol)}${rowNo}`, result };
    payable.numFmt = '#,##0.00';
    payable.font = { bold: true };
    if (idx % 2 === 1) row.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }; });
  });

  // Totals: live SUM formulas, with the computed value cached so viewers that do not recalculate still show it.
  const firstData = 5;
  const lastData = 4 + rows.length;
  const totalRowNo = lastData + 1;
  const totalRow = ws.getRow(totalRowNo);
  totalRow.getCell(1).value = 'TOTAL';
  COLUMNS.forEach((c, i) => {
    if (!c.total) return;
    const letter = colLetter(i + 1);
    const result = Math.round(rows.reduce((s, r) => s + (r[c.key] as number), 0) * 100) / 100;
    const cell = totalRow.getCell(i + 1);
    cell.value = { formula: rows.length ? `SUM(${letter}${firstData}:${letter}${lastData})` : '0', result };
    cell.numFmt = c.fmt!;
  });
  const grand = Math.round(rows.reduce((s, r) => s + r.otAmount + r.weeklyOffAmount + r.holidayAmount, 0) * 100) / 100;
  const grandCell = totalRow.getCell(lastCol);
  grandCell.value = { formula: rows.length ? `SUM(${colLetter(lastCol)}${firstData}:${colLetter(lastCol)}${lastData})` : '0', result: grand };
  grandCell.numFmt = '#,##0.00';
  totalRow.eachCell({ includeEmpty: true }, (cell, n) => {
    if (n > lastCol) return;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
    cell.border = { top: { style: 'medium', color: { argb: 'FF1E3A5F' } } };
    if (n > 3) cell.alignment = { horizontal: 'right' };
  });

  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  return wb;
};

export const otExcelFilename = (month: string): string => `ColorMyles_OT_Report_${month}.xlsx`;

/** Builds the workbook and hands it to the browser as a download. */
export const downloadOtExcel = async (rows: OtExportRow[], month: string, monthLabel: string): Promise<void> => {
  const generatedAt = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' });
  const wb = await buildOtWorkbook(rows, monthLabel, generatedAt);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = otExcelFilename(month);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
