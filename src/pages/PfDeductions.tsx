import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LocationTabs } from '../components/layout/LocationTabs';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { api } from '../services/api';
import { useMutationVersion } from '../services/dataSync';
import { AttendanceSource, EmployeePayrollSummary, PfPolicy } from '../types';
import { PiggyBank, Search, FileSpreadsheet, Loader2, Info } from 'lucide-react';
import { istMonth, monthLabel, monthOptions as monthOptionKeys } from '../lib/businessDate';
import { errorMessage } from '../lib/apiError';
import { inr } from '../lib/utils';
import { downloadPfExcel, PfExportRow } from '../lib/pfExport';

interface PfDeductionsProps {
  sources: AttendanceSource[];
  activeSourceId: string;
  onSelectSource: (id: string) => void;
  onOpenSync: (sourceId?: string) => void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const dash = (n: number | undefined) => (n === undefined ? '—' : n > 0 ? inr(n) : '—');

/** "₹15,000 for 16 days + ₹25,000 for 14 days": how the PF wages of a split month were reached. */
const segmentText = (s: EmployeePayrollSummary): string | null =>
  s.pfSegments && s.pfSegments.length > 1 ? s.pfSegments.map((g) => `${inr(g.ceiling)} ceiling × ${g.days}d`).join(' + ') : null;

/** What goes to the EPFO for the month: the employee's share, the employer's share, admin charge and EDLI. */
const remittance = (s: EmployeePayrollSummary): number => s.pfDeduction + (s.employerPf ?? 0) + (s.employerPfAdmin ?? 0) + (s.employerEdli ?? 0);

export const PfDeductions: React.FC<PfDeductionsProps> = ({ activeSourceId, sources, onSelectSource }) => {
  const [summaries, setSummaries] = useState<EmployeePayrollSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(istMonth());
  const [isExporting, setIsExporting] = useState(false);

  const monthOptions = useMemo(() => monthOptionKeys(12).map((value) => ({ value, label: monthLabel(value) })), []);
  const selectedMonthLabel = monthLabel(selectedMonth);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setSummaries((await api.getAllPayroll(selectedMonth)) || []);
    } catch (err) {
      setSummaries([]);
      setLoadError(errorMessage(err, 'Could not load the payroll for this month.'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  const mutationVersion = useMutationVersion();
  useEffect(() => { load(); }, [load, mutationVersion]);

  // The rates quoted on this page are the ones HR set in Settings, so the text can't drift from the figures.
  const [pfRules, setPfRules] = useState<PfPolicy | null>(null);
  useEffect(() => {
    api.getPolicySettings().then((p) => setPfRules(p.statutory?.pf ?? null)).catch(() => setPfRules(null));
  }, [mutationVersion]);
  const ratePct = pfRules?.employeeRatePct ?? 12;
  const pct = (n: number) => `${Number(n.toFixed(2))}%`;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return summaries
      .filter((s) => s.monthlyCtc > 0)
      .filter((s) => activeSourceId === 'all' || (s.location || '').toLowerCase() === activeSourceId.toLowerCase())
      .filter((s) => !q || s.empCode.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
  }, [summaries, activeSourceId, search]);

  const totals = useMemo(() => {
    const sum = (f: (s: EmployeePayrollSummary) => number) => round2(rows.reduce((a, s) => a + f(s), 0));
    return {
      employeePf: sum((s) => s.pfDeduction),
      employerPf: sum((s) => s.employerPf ?? 0),
      employerEpf: sum((s) => s.employerEpf ?? 0),
      employerEps: sum((s) => s.employerEps ?? 0),
      admin: sum((s) => s.employerPfAdmin ?? 0),
      edli: sum((s) => s.employerEdli ?? 0),
      esi: sum((s) => s.esiDeduction),
      pt: sum((s) => (s.ptDeductedFromNet ? s.ptDeduction : 0)),
      remit: sum(remittance),
    };
  }, [rows]);

  // The month's rule line comes from the rows themselves, so it can never disagree with the figures below.
  const splitRow = rows.find((s) => (s.pfSegments?.length ?? 0) > 1);
  const ceilings = rows.find((s) => (s.pfSegments?.length ?? 0) > 0)?.pfSegments;
  const ruleText = splitRow
    ? `This month the PF wage ceiling changed: ${splitRow.pfSegments!.map((g) => `${inr(g.ceiling)} for day ${g.fromDay}–${g.toDay}`).join(', then ')}. Each part is prorated over ${splitRow.monthDays} days and added.`
    : ceilings
    ? `PF is ${pct(ratePct)} of the earned wages (without HRA, OT and weekly-off pay), up to the ${inr(ceilings[0].ceiling)} ceiling.`
    : `PF is ${pct(ratePct)} of the earned wages (without HRA, OT and weekly-off pay), up to the PF wage ceiling.`;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const out: PfExportRow[] = rows.map((s) => ({
        empCode: s.empCode, name: s.name, location: s.location || '', uan: s.uanNumber || '',
        pfWages: s.pfWages ?? 0, employeePf: s.pfDeduction, employerEpf: s.employerEpf ?? 0, employerEps: s.employerEps ?? 0,
        admin: s.employerPfAdmin ?? 0, edli: s.employerEdli ?? 0,
      }));
      await downloadPfExcel(out, selectedMonth, selectedMonthLabel);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <PiggyBank className="w-6 h-6 text-teal-500" />
            <span>PF Deductions</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">What is cut from each employee's pay for PF, and what the company pays on top.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={rows.length === 0 || isExporting}
          className="flex items-center gap-1.5 px-3 py-2 bg-green-700 hover:bg-green-800 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed self-start"
          title={`Download ${selectedMonthLabel} PF as an Excel file. Follows the location tab and search shown.`}
        >
          {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
          Export Excel
        </button>
      </div>

      <div className="flex items-start gap-2 p-3.5 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-900">
        <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
        <span>{ruleText} Employer PF equals the employee's PF: {pct(pfRules?.epsRatePct ?? 8.33)} of the wages goes to pension, the rest to the employer's EPF account. Admin charge is {pct(pfRules?.adminRatePct ?? 0.5)} and EDLI is {pct(pfRules?.edliRatePct ?? 0.5)}.</span>
      </div>
      {loadError && <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-semibold">{loadError}</div>}

      <LocationTabs sources={sources} activeSourceId={activeSourceId} onSelectSource={onSelectSource} />

      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-card">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          aria-label="Month"
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 min-w-[180px] outline-none focus:border-[#1184b0]"
        >
          {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <div className="relative flex-1 min-w-[200px] md:ml-auto w-full md:w-auto">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-[#1184b0] focus:ring-1 focus:ring-[#1184b0]/30 outline-none transition"
          />
        </div>
      </div>

      {!isLoading && rows.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Cut from employees (PF)', totals.employeePf, 'text-rose-700'],
            ['Paid by company (PF)', totals.employerPf, 'text-indigo-700'],
            ['Admin + EDLI', round2(totals.admin + totals.edli), 'text-slate-700'],
            ['Total to remit to EPFO', totals.remit, 'text-teal-700'],
          ].map(([label, value, color]) => (
            <div key={label as string} className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">{label}</span>
              <span className={`text-xl font-heading font-extrabold font-mono ${color}`}>{inr(value as number)}</span>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState icon="search" title="No payroll data for this month" description="Employees need salary configured and attendance data synced to appear here." />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
                  <th className="py-3.5 px-4">Emp ID</th>
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4 text-right">PF wages</th>
                  <th className="py-3.5 px-4 text-right text-rose-600">Employee PF ({pct(ratePct)})</th>
                  <th className="py-3.5 px-4 text-right">Employer EPF</th>
                  <th className="py-3.5 px-4 text-right">Employer pension</th>
                  <th className="py-3.5 px-4 text-right">Admin</th>
                  <th className="py-3.5 px-4 text-right">EDLI</th>
                  <th className="py-3.5 px-4 text-right text-teal-700">Total to remit</th>
                  <th className="py-3.5 px-4 text-right text-rose-600">ESIC cut</th>
                  <th className="py-3.5 px-4 text-right text-rose-600">PT cut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {rows.map((s) => (
                  <tr key={s.empCode} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono text-[#1184b0] font-bold">{s.empCode}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                    <td className="py-3 px-4 text-right font-mono">
                      {s.pfWages !== undefined ? inr(s.pfWages) : '—'}
                      {segmentText(s) && <span className="block text-[10px] text-slate-400 font-sans">{segmentText(s)}</span>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">{dash(s.pfDeduction)}</td>
                    <td className="py-3 px-4 text-right font-mono">{dash(s.employerEpf)}</td>
                    <td className="py-3 px-4 text-right font-mono">{dash(s.employerEps)}</td>
                    <td className="py-3 px-4 text-right font-mono">{dash(s.employerPfAdmin)}</td>
                    <td className="py-3 px-4 text-right font-mono">{dash(s.employerEdli)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-teal-700">{dash(remittance(s))}</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-700">{dash(s.esiDeduction)}</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-700">{s.ptDeductedFromNet ? dash(s.ptDeduction) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-extrabold">
                  <td className="py-3 px-4" colSpan={3}>TOTAL ({rows.length})</td>
                  <td className="py-3 px-4 text-right font-mono">{inr(totals.employeePf)}</td>
                  <td className="py-3 px-4 text-right font-mono">{inr(totals.employerEpf)}</td>
                  <td className="py-3 px-4 text-right font-mono">{inr(totals.employerEps)}</td>
                  <td className="py-3 px-4 text-right font-mono">{inr(totals.admin)}</td>
                  <td className="py-3 px-4 text-right font-mono">{inr(totals.edli)}</td>
                  <td className="py-3 px-4 text-right font-mono">{inr(totals.remit)}</td>
                  <td className="py-3 px-4 text-right font-mono">{inr(totals.esi)}</td>
                  <td className="py-3 px-4 text-right font-mono">{inr(totals.pt)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
