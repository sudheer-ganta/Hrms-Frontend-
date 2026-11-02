import type { Workbook, Worksheet } from 'exceljs';
import type { AttendanceDay, RawPunch, TimesheetEmployee } from '../types';
import { formatMinutes, metaFor } from './attendanceDisplay';
import { daysInMonth, formatBusinessDate, monthLabel } from './businessDate';

/**
 * The monthly In/Out attendance report as an Excel file, laid out like the time-office "Month In/Out" report:
 * one block per employee (location title, employee line, then one row per date with IN, Out, Work+OT, OT and Break,
 * then the totals), one employee per printed page. No salary figures.
 * The punches between the first IN and the last Out (lunch and other breaks) fill Out1, In2, Out2 … In8.
 * DISPLAY ONLY. Every status, time and total is the backend's verdict for that employee and date.
 */

const COLS = 21;
const COL_OUT = 18; // the final "Out" column (column R)
const HEADERS = [
  'Date', 'Status', 'IN', 'Out1', 'In2', 'Out2', 'In3', 'Out3', 'In4', 'Out4', 'In5', 'Out5', 'In6', 'Out6', 'In7', 'Out7', 'In8',
  'Out', 'Work+OT', 'OT', 'Break',
];
const NO_TIME = '--:--';
const FONT = 'Arial';
const THIN = { style: 'thin' as const, color: { argb: 'FF000000' } };
const BORDER = { top: THIN, bottom: THIN, left: THIN, right: THIN };

/** Every machine punch time (HH:mm, in time order) per employee code and business date. */
export type DayPunches = Record<string, Record<string, string[]>>;

export const groupPunches = (punches: RawPunch[]): DayPunches => {
  const out: DayPunches = {};
  for (const p of punches) {
    const times = ((out[p.employeeCode] ??= {})[p.entryDate] ??= []);
    const t = p.entryTime.slice(0, 5);
    if (!times.includes(t)) times.push(t);
  }
  for (const days of Object.values(out)) for (const times of Object.values(days)) times.sort();
  return out;
};

const MIDDLE_SLOTS = 14; // Out1, In2, Out2 … Out7, In8

/** The punches between the day's first IN and last Out, in order: they fill Out1, In2, Out2 and so on. */
const middlePunches = (day: AttendanceDay | undefined, times: string[] | undefined): string[] => {
  if (!day || !day.firstIn || !day.lastOut || !times) return [];
  const first = toMinutes(day.firstIn);
  const last = toMinutes(day.lastOut);
  if (last <= first) return [];
  return times.filter((t) => toMinutes(t) > first && toMinutes(t) < last).slice(0, MIDDLE_SLOTS);
};

const dayMonth = (d: string) => `${d.slice(8, 10)}-${d.slice(5, 7)}`;
const dmy = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

const isWholeMonth = (from: string, to: string): boolean => {
  const days = daysInMonth(from.slice(0, 7));
  return from === days[0] && to === days[days.length - 1];
};

/** "October 2026" for a whole calendar month, otherwise "01 Oct 2026 to 15 Oct 2026". */
export const sheetRangeLabel = (dates: string[]): string => {
  if (dates.length === 0) return 'Selected Dates';
  const from = dates[0];
  const to = dates[dates.length - 1];
  return isWholeMonth(from, to) ? monthLabel(from.slice(0, 7)) : `${formatBusinessDate(from)} to ${formatBusinessDate(to)}`;
};

/** "October-2026" for a whole month, otherwise "01/10/2026 to 15/10/2026" (the report month line of each block). */
const reportMonthText = (dates: string[]): string => {
  const from = dates[0];
  const to = dates[dates.length - 1];
  return isWholeMonth(from, to) ? monthLabel(from.slice(0, 7)).replace(' ', '-') : `${dmy(from)} to ${dmy(to)}`;
};

/** Excel tab name (31 characters at most): "In-Out October 2026" or "In-Out 01-10 to 15-10". */
export const attendanceSheetName = (dates: string[]): string => {
  if (dates.length === 0) return 'In-Out';
  const from = dates[0];
  const to = dates[dates.length - 1];
  return (isWholeMonth(from, to) ? `In-Out ${monthLabel(from.slice(0, 7))}` : `In-Out ${dayMonth(from)} to ${dayMonth(to)}`).slice(0, 31);
};

export const attendanceSheetFilename = (dates: string[]): string => {
  if (dates.length === 0) return 'ColorMyles_Month_InOut.xlsx';
  const from = dates[0];
  const to = dates[dates.length - 1];
  const part = isWholeMonth(from, to) ? monthLabel(from.slice(0, 7)).replace(/\s+/g, '_') : `${from}_to_${to}`;
  return `ColorMyles_Month_InOut_${part}.xlsx`;
};

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Time away between the first IN and the last Out. The day's Work+OT already has breaks taken off, so the
 * difference is the break. Zero when there is no complete in/out pair.
 */
const breakMinutes = (day: AttendanceDay | undefined): number => {
  if (!day || !day.firstIn || !day.lastOut || day.workMinutes <= 0) return 0;
  let elapsed = toMinutes(day.lastOut) - toMinutes(day.firstIn);
  if (elapsed < 0) elapsed += 24 * 60; // worked past midnight
  return Math.max(0, elapsed - day.workMinutes);
};

const style = (ws: Worksheet, row: number, col: number, opts: { size?: number; color?: string; align?: 'left' | 'center'; bold?: boolean } = {}) => {
  const cell = ws.getCell(row, col);
  cell.font = { name: FONT, size: opts.size ?? 10, bold: opts.bold ?? false, color: { argb: opts.color ?? 'FF000000' } };
  cell.alignment = { horizontal: opts.align ?? 'center', vertical: 'middle', wrapText: true };
  cell.border = BORDER;
  return cell;
};

/** Writes a value across columns [from, to] (1-based, inclusive), merged when it spans more than one. */
const span = (ws: Worksheet, row: number, from: number, to: number, value: string | number, opts: Parameters<typeof style>[3] = {}) => {
  if (to > from) ws.mergeCells(row, from, row, to);
  for (let c = from; c <= to; c++) style(ws, row, c, opts);
  ws.getCell(row, from).value = value;
};

export const buildAttendanceSheetWorkbook = async (timesheets: TimesheetEmployee[], dates: string[], punches: DayPunches = {}): Promise<Workbook> => {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ColorMyles HRMS';
  const ws = wb.addWorksheet(attendanceSheetName(dates), { pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });

  ws.getColumn(1).width = 11;
  for (let c = 2; c <= COLS; c++) ws.getColumn(c).width = 6.2;
  ws.getColumn(3).width = 7;
  ws.getColumn(COL_OUT).width = 7;
  ws.getColumn(19).width = 8;

  const month = dates.length ? reportMonthText(dates) : '';
  let r = 1;

  timesheets.forEach((sheet) => {
    // Title: the location, the way the machine report names it.
    span(ws, r, 1, COLS, sheet.siteName ?? 'ColorMyles', { size: 11, bold: true });
    r++;

    // Dept. / Incharge / report month, kept as in the original layout.
    span(ws, r, 1, 2, 'Dept. Name', { align: 'left', bold: true });
    span(ws, r, 3, 10, 'Incharge', { align: 'left' });
    span(ws, r, 11, 14, 'Report Month:-', { align: 'left', bold: true });
    span(ws, r, 15, 18, month, { align: 'left' });
    r++;

    // Employee line.
    style(ws, r, 1, { align: 'left', bold: true }).value = 'Empcode';
    span(ws, r, 2, 7, sheet.employeeCode, { align: 'left' });
    span(ws, r, 8, 9, 'Name', { align: 'left', bold: true });
    span(ws, r, 10, 18, sheet.employeeName, { align: 'left' });
    r++;

    HEADERS.forEach((h, i) => { style(ws, r, i + 1, { size: 8, bold: true }).value = h; });
    r++;

    let breakTotal = 0;
    let weeklyOffs = 0;
    let holidays = 0;
    dates.forEach((d) => {
      const day = sheet.days[d];
      const brk = breakMinutes(day);
      breakTotal += brk;
      if (day?.status === 'WEEKLY_OFF') weeklyOffs++;
      if (day?.status === 'HOLIDAY') holidays++;

      for (let c = 1; c <= COLS; c++) style(ws, r, c, { size: 9 });
      ws.getCell(r, 1).value = dmy(d);
      ws.getCell(r, 2).value = day ? (day.inProgress ? 'IN' : metaFor(day.status).short) : '';
      ws.getCell(r, 3).value = day?.firstIn ?? NO_TIME;
      middlePunches(day, punches[sheet.employeeCode]?.[d]).forEach((t, i) => { ws.getCell(r, 4 + i).value = t; });
      ws.getCell(r, COL_OUT).value = day?.lastOut ?? NO_TIME;
      ws.getCell(r, 19).value = formatMinutes(day?.workMinutes);
      ws.getCell(r, 20).value = formatMinutes(day?.overtimeMinutes);
      ws.getCell(r, 21).value = formatMinutes(brk);
      r++;
    });

    span(ws, r, 1, COLS, '');
    const run = (text: string, bold: boolean) => ({ text, font: { name: FONT, size: 10, bold } });
    ws.getCell(r, 1).value = {
      richText: [
        run('Total Work+OT Hrs:-', true), run(`  ${formatMinutes(sheet.totals.workMinutes)}      `, false),
        run('Total OT Hrs:-', true), run(`  ${formatMinutes(sheet.totals.overtimeMinutes)}      `, false),
        run('Total Break Hrs:-', true), run(`  ${formatMinutes(breakTotal)}`, false),
      ],
    };
    r++;

    // Labels in bold, the figures beside them in the same colour, as in the time-office report.
    const green = 'FF00C000';
    const darkGreen = 'FF006400';
    const blue = 'FF0000FF';
    const red = 'FFFF0000';
    const orange = 'FFC65911';
    style(ws, r, 1, { color: green, bold: true }).value = 'Total Pr.';
    span(ws, r, 2, 3, sheet.totals.presentDays, { color: green });
    span(ws, r, 5, 7, 'Total WO', { color: blue, bold: true });
    span(ws, r, 8, 9, weeklyOffs, { color: blue });
    span(ws, r, 12, 13, 'Tot. Ab', { color: red, bold: true });
    span(ws, r, 14, 15, sheet.totals.absentDays, { color: red });
    r++;

    style(ws, r, 1, { color: darkGreen, bold: true }).value = 'Total HL';
    span(ws, r, 2, 3, holidays, { color: darkGreen });
    span(ws, r, 5, 7, 'Total Leave', { color: blue, bold: true });
    span(ws, r, 8, 9, sheet.totals.leaveDays, { color: blue });
    span(ws, r, 12, 13, 'Half Day', { color: orange, bold: true });
    span(ws, r, 14, 15, sheet.totals.halfDays, { color: orange });

    // One employee per printed page.
    ws.getRow(r).addPageBreak();
    r += 2;
  });

  ws.eachRow((row) => { row.height = 18; });
  return wb;
};

/** Builds the workbook and hands it to the browser as a download. */
export const downloadAttendanceSheet = async (timesheets: TimesheetEmployee[], dates: string[], punches: DayPunches = {}): Promise<void> => {
  const wb = await buildAttendanceSheetWorkbook(timesheets, dates, punches);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = attendanceSheetFilename(dates);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
