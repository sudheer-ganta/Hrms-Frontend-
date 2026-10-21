import type { Workbook } from 'exceljs';

/**
 * One month of provident fund as an Excel file for the PF filing.
 * Every figure is taken verbatim from the backend payroll engine (the same numbers the PF & Deductions page shows);
 * only the "Total to remit" and the column totals are Excel formulas over those cells.
 */
export interface PfExportRow {
  empCode: string;
  name: string;
  location: string;
  uan: string;
  pfWages: number;
  employeePf: number;
  employerEpf: number;
  employerEps: number;
  admin: number;
  edli: number;
}

const COLUMNS: { header: string; key: keyof PfExportRow; width: number; money?: boolean }[] = [
  { header: 'Emp Code', key: 'empCode', width: 11 },
  { header: 'Employee Name', key: 'name', width: 26 },
  { header: 'Location', key: 'location', width: 14 },
  { header: 'UAN', key: 'uan', width: 15 },
  { header: 'PF Wages (₹)', key: 'pfWages', width: 14, money: true },
  { header: 'Employee PF (₹)', key: 'employeePf', width: 15, money: true },
  { header: 'Employer EPF (₹)', key: 'employerEpf', width: 15, money: true },
  { header: 'Employer Pension (₹)', key: 'employerEps', width: 17, money: true },
  { header: 'Admin Charge (₹)', key: 'admin', width: 15, money: true },
  { header: 'EDLI (₹)', key: 'edli', width: 12, money: true },
];
const TOTAL_HEADER = 'Total to remit (₹)';

export const buildPfWorkbook = async (rows: PfExportRow[], monthLabel: string, generatedAt: string): Promise<Workbook> => {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ColorMyles HRMS';
  const ws = wb.addWorksheet(`PF ${monthLabel}`.slice(0, 31), { views: [{ state: 'frozen', ySplit: 4, xSplit: 2 }] });
  const lastCol = COLUMNS.length + 1;

  ws.mergeCells(1, 1, 1, lastCol);
  ws.getCell(1, 1).value = `ColorMyles: Provident Fund, ${monthLabel}`;
  ws.getCell(1, 1).font = { bold: true, size: 14 };
  ws.mergeCells(2, 1, 2, lastCol);
  ws.getCell(2, 1).value = `Generated ${generatedAt} IST · ${rows.length} employee(s)`;
  ws.getCell(2, 1).font = { italic: true, color: { argb: 'FF64748B' } };

  const headerRow = ws.getRow(4);
  [...COLUMNS.map((c) => c.header), TOTAL_HEADER].forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.alignment = { vertical: 'middle', horizontal: i < 4 ? 'left' : 'right', wrapText: true };
  });
  headerRow.height = 34;
  COLUMNS.forEach((c, i) => { ws.getColumn(i + 1).width = c.width; });
  ws.getColumn(lastCol).width = 18;

  const letter = (n: number) => ws.getColumn(n).letter;
  const col = (key: keyof PfExportRow) => COLUMNS.findIndex((c) => c.key === key) + 1;
  const r2 = (n: number) => Math.round(n * 100) / 100;

  rows.forEach((r, idx) => {
    const rowNo = 5 + idx;
    const row = ws.getRow(rowNo);
    COLUMNS.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      cell.value = r[c.key] as string | number;
      if (c.money) { cell.numFmt = '#,##0.00'; cell.alignment = { horizontal: 'right' }; }
    });
    const total = row.getCell(lastCol);
    const parts = (['employeePf', 'employerEpf', 'employerEps', 'admin', 'edli'] as const).map((k) => `${letter(col(k))}${rowNo}`);
    total.value = { formula: parts.join('+'), result: r2(r.employeePf + r.employerEpf + r.employerEps + r.admin + r.edli) };
    total.numFmt = '#,##0.00';
    total.font = { bold: true };
  });

  const first = 5;
  const last = 4 + rows.length;
  const totalRow = ws.getRow(last + 1);
  totalRow.getCell(1).value = 'TOTAL';
  COLUMNS.forEach((c, i) => {
    if (!c.money) return;
    const l = letter(i + 1);
    const cell = totalRow.getCell(i + 1);
    cell.value = { formula: rows.length ? `SUM(${l}${first}:${l}${last})` : '0', result: r2(rows.reduce((s, r) => s + (r[c.key] as number), 0)) };
    cell.numFmt = '#,##0.00';
  });
  const grand = totalRow.getCell(lastCol);
  grand.value = {
    formula: rows.length ? `SUM(${letter(lastCol)}${first}:${letter(lastCol)}${last})` : '0',
    result: r2(rows.reduce((s, r) => s + r.employeePf + r.employerEpf + r.employerEps + r.admin + r.edli, 0)),
  };
  grand.numFmt = '#,##0.00';
  totalRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true };
    cell.border = { top: { style: 'thin' } };
  });
  return wb;
};

export const downloadPfExcel = async (rows: PfExportRow[], month: string, monthLabel: string): Promise<void> => {
  const generatedAt = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' });
  const wb = await buildPfWorkbook(rows, monthLabel, generatedAt);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PF_${month}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
