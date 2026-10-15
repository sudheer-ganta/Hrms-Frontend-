import type { EmployeePayrollSummary, PayslipLine } from '../types';

/**
 * Company letterhead printed on every payslip. Presentation only: no payroll rule lives here.
 */
export const PAYSLIP_COMPANY = {
  name: 'COLOR MYLES',
  address: 'Flat No: 43-44/345, 1st Main Road, Banashankari Layout, Bengaluru, Bengaluru Urban, Karnataka - 560049',
  logo: '/payslip-logo.jpg',
  footer: 'Computer Generated, Signature Not Required',
} as const;

/**
 * One row of the two-column earnings / deductions table. The payslip layout is a fixed set of
 * headings; every amount still comes from `summary.payslip` (backend), grouped under the heading
 * whose `codes` it carries. Lines no heading claims are appended so the columns always foot to the
 * totals the backend computed.
 */
export interface SlipRow { label: string; amount: number; fixed?: number }

interface Heading { label: string; codes: string[]; fixed?: (s: EmployeePayrollSummary) => number }

const EARNING_HEADINGS: Heading[] = [
  { label: 'Basic Pay', codes: ['BASIC'], fixed: (s) => s.basicSalary },
  { label: 'VDA', codes: ['DA'], fixed: (s) => s.da },
  { label: 'HRA', codes: ['HRA'], fixed: (s) => s.hra },
  { label: 'LTA', codes: [] },
  { label: 'Other Allowances', codes: ['OTHER'], fixed: (s) => s.otherAllowance },
  { label: 'Sunday working Allowance', codes: ['WEEKLY_OFF_WORK', 'HOLIDAY_WORK', 'SUNDAY'] },
  { label: 'Conveyance', codes: [] },
  { label: 'Increments-Re-Imbursements', codes: [] },
  { label: 'incentive', codes: [] }, // labelled with the month below
  { label: 'Other / Attn Bonus', codes: [] },
  { label: 'Special Allowance', codes: ['SPECIAL'], fixed: (s) => s.allowances },
];

const DEDUCTION_HEADINGS: Heading[] = [
  { label: 'ESI', codes: ['ESI'] },
  { label: 'PF', codes: ['PF'] },
  { label: 'PT', codes: ['PT'] },
  { label: 'Salary Advance', codes: [] },
  { label: 'Other deduction', codes: [] },
  { label: 'LWF', codes: [] },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-09" -> "Sep_26" (used by the monthly incentive heading). */
export const shortMonth = (month: string): string => {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS[(m || 1) - 1]}_${String(y).slice(-2)}`;
};

/** "2026-09" -> "Sep- 2026" (the title's period). */
export const periodLabel = (month: string): string => {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS[(m || 1) - 1]}- ${y}`;
};

/** "2026-09-01" -> "01.09.2026". */
export const dotDate = (iso?: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
};

const r2 = (n: number) => Math.round(n * 100) / 100;

const group = (lines: PayslipLine[], headings: Heading[], s: EmployeePayrollSummary, withFixed: boolean): SlipRow[] => {
  const claimed = new Set<string>();
  const rows: SlipRow[] = headings.map((h) => {
    const mine = lines.filter((l) => h.codes.includes(l.code));
    mine.forEach((l) => claimed.add(l.code));
    const label = h.label === 'incentive' ? `incentive for ${shortMonth(s.month)}` : h.label;
    const row: SlipRow = { label, amount: r2(mine.reduce((a, l) => a + l.amount, 0)) };
    if (withFixed && h.fixed) row.fixed = h.fixed(s);
    return row;
  });
  for (const l of lines) if (!claimed.has(l.code)) rows.push({ label: l.note ? `${l.label} (${l.note})` : l.label, amount: l.amount });
  return rows;
};

export interface SlipView {
  earnings: SlipRow[];
  deductions: SlipRow[];
  totalFixed: number;
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
}

/** Everything the payslip table needs, derived from the backend's `payslip` block (nothing recomputed). */
export const buildSlipView = (s: EmployeePayrollSummary): SlipView => {
  const p = s.payslip;
  return {
    earnings: group(p.earnings, EARNING_HEADINGS, s, true),
    deductions: group(p.deductions, DEDUCTION_HEADINGS, s, false),
    totalFixed: s.grossSalary,
    totalEarnings: p.totalEarnings,
    totalDeductions: p.totalDeductions,
    netPay: p.netPay,
  };
};
