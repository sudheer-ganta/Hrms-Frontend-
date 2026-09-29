import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LocationTabs } from '../components/layout/LocationTabs';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { api } from '../services/api';
import { AttendanceSource, EmployeePayrollSummary } from '../types';
import { getShiftStandardHours } from '../lib/utils';
import {
  Calculator,
  Search,
  Download,
  ChevronDown,
  Sigma,
  FileSpreadsheet,
  Sparkles,
  RotateCcw,
  Clock,
  Save,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface OTCalculatorProps {
  sources: AttendanceSource[];
  activeSourceId: string;
  onSelectSource: (id: string) => void;
  onOpenSync: (sourceId?: string) => void;
}

// Generate month options (current + 11 previous months)
const generateMonthOptions = (): { value: string; label: string }[] => {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    months.push({ value, label });
  }
  return months;
};

interface OTRow {
  empCode: string;
  name: string;
  location: string;
  baseSalary: number; // monthly CTC
  grossSalary: number;
  totalDeductions: number;
  lopDeduction: number;
  pfDeduction: number;
  ptDeduction: number;
  baseNetPay: number; // Net take-home before OT
  monthDays: number;
  payableDays: number;
  lopDays: number;
  totalWorkHours: number; // dynamic from biometric sync
  presentDays: number;
  multiplier: number; // editable
  otHours: number; // editable
  standardDailyWage: number;
  standardHourlyWage: number;
  isWorkHoursOverridden: boolean;
  isOtOverridden: boolean;
  isMultiplierOverridden: boolean;
}

// All formulas — aligned with the server statutory payroll engine.
// standardHoursPerDay is derived dynamically from the configured shift
// start/end time (see getShiftStandardHours in lib/utils) rather than a
// hardcoded assumption, so this always agrees with payroll.service.ts.
const calcStandardDailyWage = (baseSalary: number) =>
  Math.round((baseSalary / 26) * 100) / 100;

const calcStandardHourlyWage = (baseSalary: number, standardHoursPerDay: number) =>
  Math.round((baseSalary / (26 * standardHoursPerDay)) * 100) / 100;

const calcOtHours = (totalWorkHours: number, presentDays: number, standardHoursPerDay: number) => {
  const expected = presentDays * standardHoursPerDay;
  const ot = totalWorkHours - expected;
  return ot > 0 ? Math.round(ot * 10) / 10 : 0;
};

const calcOtAmount = (otHours: number, standardHourlyWage: number, multiplier: number) =>
  Math.round(otHours * standardHourlyWage * multiplier);

const calcFinalNetPay = (baseNetPay: number, otAmount: number) =>
  baseNetPay + otAmount;

export const OTCalculator: React.FC<OTCalculatorProps> = ({
  sources,
  activeSourceId,
  onSelectSource,
  onOpenSync,
}) => {
  const [summaries, setSummaries] = useState<EmployeePayrollSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [globalMultiplier, setGlobalMultiplier] = useState<number>(2);
  const [rowMultipliers, setRowMultipliers] = useState<Record<string, number>>({});
  const [rowWorkHours, setRowWorkHours] = useState<Record<string, number>>({});
  const [rowOtHours, setRowOtHours] = useState<Record<string, number>>({});
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [standardHoursPerDay, setStandardHoursPerDay] = useState<number>(8);

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  useEffect(() => {
    api.getPolicySettings()
      .then((policy) => {
        setStandardHoursPerDay(getShiftStandardHours(policy.shift.startTime, policy.shift.endTime));
      })
      .catch(() => {
        // Keep the 8h fallback if settings can't be loaded
      });
  }, []);

  const loadPayroll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, adj] = await Promise.all([
        api.getAllPayroll(selectedMonth),
        api.getPayrollAdjustments(selectedMonth).catch(() => ({} as Record<string, any>)),
      ]);

      setSummaries(data || []);

      // Pre-fill per-row custom overrides from backend adjustments if present
      const initMult: Record<string, number> = {};
      const initWork: Record<string, number> = {};
      const initOt: Record<string, number> = {};

      Object.entries(adj || {}).forEach(([emp, val]: [string, any]) => {
        if (val.multiplier !== undefined) initMult[emp] = val.multiplier;
        if (val.totalWorkHours !== undefined) initWork[emp] = val.totalWorkHours;
        if (val.otHours !== undefined) initOt[emp] = val.otHours;
      });

      setRowMultipliers(initMult);
      setRowWorkHours(initWork);
      setRowOtHours(initOt);
    } catch (err) {
      console.error('Failed to load payroll data', err);
      setSummaries([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  // Filter by location
  const locationFiltered = useMemo(() => {
    if (activeSourceId === 'all') return summaries;
    return summaries.filter((s) => {
      const loc = (s.location || '').toLowerCase();
      return loc === activeSourceId.toLowerCase();
    });
  }, [summaries, activeSourceId]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return locationFiltered;
    const q = search.toLowerCase();
    return locationFiltered.filter(
      (s) =>
        s.empCode.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
    );
  }, [locationFiltered, search]);

  // Build OT rows with computed values & overrides
  const otRows = useMemo(() => {
    return filtered
      .filter((s) => s.monthlyCtc > 0)
      .map((s): OTRow => {
        const isWorkHoursOverridden = rowWorkHours[s.empCode] !== undefined;
        const isOtOverridden = rowOtHours[s.empCode] !== undefined;
        const isMultiplierOverridden = rowMultipliers[s.empCode] !== undefined;

        const totalWorkHours = isWorkHoursOverridden
          ? rowWorkHours[s.empCode]
          : s.totalWorkHours || 0;

        const autoOtHours = calcOtHours(totalWorkHours, s.presentDays || 0, standardHoursPerDay);

        const otHours = isOtOverridden
          ? rowOtHours[s.empCode]
          : (s.totalOtHours || autoOtHours);

        const multiplier = isMultiplierOverridden
          ? rowMultipliers[s.empCode]
          : globalMultiplier;

        const standardDailyWage = calcStandardDailyWage(s.monthlyCtc);
        const standardHourlyWage = calcStandardHourlyWage(s.monthlyCtc, standardHoursPerDay);
        // Base take-home pay without OT
        const baseNetPay = Math.max(0, (s.netPayable || 0) - (s.otEarnings || 0));

        return {
          empCode: s.empCode,
          name: s.name,
          location: s.location || '',
          baseSalary: s.monthlyCtc,
          grossSalary: s.grossEarnings || s.monthlyCtc,
          totalDeductions: s.totalDeductions || 0,
          lopDeduction: s.lopDeduction || 0,
          pfDeduction: s.pfDeduction || 0,
          ptDeduction: s.ptDeduction || 0,
          baseNetPay,
          monthDays: s.monthDays || 30,
          payableDays: s.payableDays || 0,
          lopDays: s.lopDays || 0,
          totalWorkHours,
          presentDays: s.presentDays || 0,
          multiplier,
          otHours,
          standardDailyWage,
          standardHourlyWage,
          isWorkHoursOverridden,
          isOtOverridden,
          isMultiplierOverridden,
        };
      });
  }, [filtered, rowMultipliers, rowWorkHours, rowOtHours, globalMultiplier, standardHoursPerDay]);

  // Apply global multiplier to all
  const handleSetAllMultiplier = () => {
    setRowMultipliers({});
  };

  // Reset all overrides back to live sync
  const handleResetAllOverrides = async () => {
    setRowMultipliers({});
    setRowWorkHours({});
    setRowOtHours({});
    try {
      await api.clearPayrollAdjustments(selectedMonth);
      setSaveSuccessMessage('Reset all adjustments to live attendance defaults.');
      await loadPayroll();
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err) {
      console.warn('Failed to clear adjustments on backend', err);
    }
  };

  // Save adjustments to backend so all payroll everywhere updates
  const handleSaveToPayroll = async () => {
    setIsSaving(true);
    setSaveSuccessMessage(null);
    try {
      const adjustmentsToSave: Record<
        string,
        { otHours?: number; totalWorkHours?: number; multiplier?: number }
      > = {};

      otRows.forEach((r) => {
        const hasOverride = r.isWorkHoursOverridden || r.isOtOverridden || r.isMultiplierOverridden;
        if (hasOverride) {
          adjustmentsToSave[r.empCode] = {
            ...(r.isWorkHoursOverridden ? { totalWorkHours: r.totalWorkHours } : {}),
            ...(r.isOtOverridden ? { otHours: r.otHours } : {}),
            ...(r.isMultiplierOverridden ? { multiplier: r.multiplier } : {}),
          };
        }
      });

      await api.savePayrollAdjustments(selectedMonth, adjustmentsToSave);
      setSaveSuccessMessage('Saved to Payroll! Payslips, Employee Portal, and Drawer updated with new OT figures.');
      await loadPayroll();
      setTimeout(() => setSaveSuccessMessage(null), 6000);
    } catch (err: any) {
      console.error('Failed to save adjustments to payroll', err);
      alert('Failed to save to payroll: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const hasAnyOverrides = useMemo(() => {
    return (
      Object.keys(rowMultipliers).length > 0 ||
      Object.keys(rowWorkHours).length > 0 ||
      Object.keys(rowOtHours).length > 0
    );
  }, [rowMultipliers, rowWorkHours, rowOtHours]);

  // Per-row multiplier change
  const handleRowMultiplierChange = (empCode: string, val: number) => {
    setRowMultipliers((prev) => ({ ...prev, [empCode]: Math.max(0, val) }));
  };

  // Per-row work hours change
  const handleRowWorkHoursChange = (empCode: string, val: number) => {
    setRowWorkHours((prev) => ({ ...prev, [empCode]: Math.max(0, val) }));
  };

  // Per-row OT hours change
  const handleRowOtHoursChange = (empCode: string, val: number) => {
    setRowOtHours((prev) => ({ ...prev, [empCode]: Math.max(0, val) }));
  };

  // Reset a single row's overrides
  const handleResetRow = (empCode: string) => {
    setRowMultipliers((prev) => {
      const next = { ...prev };
      delete next[empCode];
      return next;
    });
    setRowWorkHours((prev) => {
      const next = { ...prev };
      delete next[empCode];
      return next;
    });
    setRowOtHours((prev) => {
      const next = { ...prev };
      delete next[empCode];
      return next;
    });
  };

  // Summary totals
  const totals = useMemo(() => {
    let totalHoursWorked = 0;
    let totalOtHrs = 0;
    let totalOtAmt = 0;
    let totalFinal = 0;
    let totalBaseNet = 0;
    let totalDeductions = 0;

    otRows.forEach((r) => {
      const otA = calcOtAmount(r.otHours, r.standardHourlyWage, r.multiplier);
      const final_ = calcFinalNetPay(r.baseNetPay, otA);

      totalHoursWorked += r.totalWorkHours;
      totalOtHrs += r.otHours;
      totalOtAmt += otA;
      totalFinal += final_;
      totalBaseNet += r.baseNetPay;
      totalDeductions += r.totalDeductions;
    });

    return { totalHoursWorked, totalOtHrs, totalOtAmt, totalFinal, totalBaseNet, totalDeductions };
  }, [otRows]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Emp ID',
      'Name',
      'Base CTC (₹)',
      'Base Net Pay (₹)',
      'Deductions (₹)',
      'Per Day Rate (₹)',
      'Per Hour Rate (₹)',
      'Hours Worked',
      'OT Multiplier',
      'OT Hours',
      'OT Amount (₹)',
      'Final Net Take-Home (₹)',
    ];

    const rows: string[] = [];
    rows.push(['ColorMyles HRMS — Unified OT & Payroll Export'].map((s) => `"${s}"`).join(','));
    rows.push([`Month: ${monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth}`, `Generated: ${new Date().toLocaleString()}`].map((s) => `"${s}"`).join(','));
    rows.push('');
    rows.push(headers.map((h) => `"${h}"`).join(','));

    otRows.forEach((r) => {
      const otA = calcOtAmount(r.otHours, r.standardHourlyWage, r.multiplier);
      const final_ = calcFinalNetPay(r.baseNetPay, otA);

      const row = [
        r.empCode,
        r.name,
        r.baseSalary,
        r.baseNetPay,
        r.totalDeductions,
        r.standardDailyWage,
        r.standardHourlyWage,
        r.totalWorkHours,
        `${r.multiplier}x`,
        r.otHours,
        otA,
        final_,
      ];
      rows.push(row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    });

    // Totals row
    rows.push('');
    rows.push(['', '', '', totals.totalBaseNet, totals.totalDeductions, '', '', totals.totalHoursWorked, '', totals.totalOtHrs, totals.totalOtAmt, totals.totalFinal].map((v) => `"${v}"`).join(','));

    const blob = new Blob([rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OT_Payroll_Report_${selectedMonth}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedMonthLabel = monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Calculator className="w-6 h-6 text-indigo-500" />
            <span>OT Calculator & Payroll</span>
            <span className="ml-2 text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
              Unified Engine
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Live sync with Official Payroll Engine — edit hours or multiplier, and save to update Payslips & Employee Portal
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasAnyOverrides && (
            <button
              onClick={handleResetAllOverrides}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition shadow-xs"
              title="Reset all manual overrides back to calculated defaults"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Reset All Edits
            </button>
          )}
          <button
            onClick={handleSaveToPayroll}
            disabled={isSaving || otRows.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save custom OT hours & multipliers so Payslips and Employee records everywhere reflect these adjustments"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save to Payroll
              </>
            )}
          </button>
          <button
            onClick={handleExportCSV}
            disabled={otRows.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Save Success Alert Banner */}
      {saveSuccessMessage && (
        <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-medium animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Location Tabs */}
      <LocationTabs
        sources={sources}
        activeSourceId={activeSourceId}
        onSelectSource={onSelectSource}
      />

      {/* Controls Row: Month selector, Global Multiplier, Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-card">
        {/* Month Selector */}
        <div className="relative">
          <button
            onClick={() => setIsMonthOpen(!isMonthOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition min-w-[180px] justify-between"
          >
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#1184b0]" />
              {selectedMonthLabel}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMonthOpen ? 'rotate-180' : ''}`} />
          </button>
          {isMonthOpen && (
            <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-full max-h-64 overflow-y-auto">
              {monthOptions.map((m) => (
                <button
                  key={m.value}
                  onClick={() => {
                    setSelectedMonth(m.value);
                    setIsMonthOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-sky-50 transition ${
                    m.value === selectedMonth
                      ? 'bg-sky-50 text-[#1184b0] font-bold'
                      : 'text-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global Multiplier */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            All Multiplier:
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={globalMultiplier}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= 0) setGlobalMultiplier(val);
              }}
              className="w-16 px-2 py-1.5 text-xs font-mono font-bold text-center border border-indigo-200 rounded-lg bg-indigo-50 text-indigo-700 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
            />
            <span className="text-xs font-bold text-indigo-500">×</span>
          </div>
          <button
            onClick={handleSetAllMultiplier}
            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition shadow-xs uppercase tracking-wider"
          >
            Apply All
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] md:ml-auto">
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

      {/* Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : otRows.length === 0 ? (
        <EmptyState
          icon="search"
          title="No payroll data for this month"
          description="Employees need salary configured and attendance data synced to appear here."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-200 sticky top-0 z-10">
                <tr className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
                  <th className="py-3.5 px-4 sticky left-0 bg-gradient-to-r from-slate-50 to-indigo-50/30 z-20 min-w-[100px]">Emp ID</th>
                  <th className="py-3.5 px-4 sticky left-[100px] bg-gradient-to-r from-slate-50 to-indigo-50/30 z-20 min-w-[160px]">Name</th>
                  <th className="py-3.5 px-4 text-right min-w-[105px]">Base CTC</th>
                  <th className="py-3.5 px-4 text-right min-w-[120px]">
                    <span className="flex items-center justify-end gap-1">
                      <Sigma className="w-3 h-3 text-emerald-500" />
                      Base Net Pay
                    </span>
                  </th>
                  <th className="py-3.5 px-4 text-right min-w-[105px]">
                    <span className="text-rose-500 font-bold">Deductions</span>
                  </th>
                  <th className="py-3.5 px-4 text-right min-w-[100px]">Per Day</th>
                  <th className="py-3.5 px-4 text-right min-w-[95px]">Per Hour</th>
                  <th className="py-3.5 px-4 text-right min-w-[110px]">
                    <span className="flex items-center justify-end gap-1 text-slate-700">
                      <Clock className="w-3 h-3 text-slate-500" />
                      Hrs Worked
                    </span>
                  </th>
                  <th className="py-3.5 px-4 text-center min-w-[95px]">
                    <span className="text-indigo-600 font-bold">Multiplier</span>
                  </th>
                  <th className="py-3.5 px-4 text-right min-w-[110px]">
                    <span className="text-violet-600 font-bold">OT Hrs</span>
                  </th>
                  <th className="py-3.5 px-4 text-right min-w-[110px]">OT Amount</th>
                  <th className="py-3.5 px-4 text-right min-w-[125px]">
                    <span className="flex items-center justify-end gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Final Net Pay
                    </span>
                  </th>
                  <th className="py-3.5 px-2 text-center min-w-[40px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {otRows.map((r, idx) => {
                  const otA = calcOtAmount(r.otHours, r.standardHourlyWage, r.multiplier);
                  const final_ = calcFinalNetPay(r.baseNetPay, otA);
                  const hasRowOverride = r.isOtOverridden || r.isMultiplierOverridden;

                  return (
                    <tr
                      key={r.empCode}
                      className={`hover:bg-indigo-50/30 transition-all group ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      }`}
                    >
                      {/* Emp ID — Sticky */}
                      <td className={`py-3 px-4 sticky left-0 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} group-hover:bg-indigo-50/30 transition-colors`}>
                        <span className="font-mono font-bold text-[#1184b0] text-[11px]">{r.empCode}</span>
                      </td>
                      {/* Name — Sticky */}
                      <td className={`py-3 px-4 sticky left-[100px] z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} group-hover:bg-indigo-50/30 transition-colors`}>
                        <span className="font-bold text-slate-900 text-xs">{r.name}</span>
                      </td>
                      {/* Base CTC */}
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-800">
                        ₹{r.baseSalary.toLocaleString('en-IN')}
                      </td>
                      {/* Base Net Pay (Take-Home before OT) */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-bold text-emerald-600 text-xs bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60" title={`Payable Days: ${r.payableDays}d`}>
                          ₹{r.baseNetPay.toLocaleString('en-IN')}
                        </span>
                      </td>
                      {/* Deductions (LOP + PF + PT) */}
                      <td className="py-3 px-4 text-right font-mono text-xs text-rose-600" title={`LOP: -₹${r.lopDeduction} (${r.lopDays}d) | PF: -₹${r.pfDeduction} | PT: -₹${r.ptDeduction}`}>
                        {r.totalDeductions > 0 ? `-₹${r.totalDeductions.toLocaleString('en-IN')}` : '₹0'}
                      </td>
                      {/* Per Day Rate */}
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 font-semibold" title={`Base CTC / 26 days = ₹${r.standardDailyWage}/day`}>
                        ₹{r.standardDailyWage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      {/* Per Hour Rate */}
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-600" title={`Base CTC / (26 × 8h) = ₹${r.standardHourlyWage}/hr`}>
                        ₹{r.standardHourlyWage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      {/* Hours Worked — DYNAMIC (Read-Only) */}
                      <td className="py-3 px-4 text-right">
                        <span
                          className="font-mono font-bold text-slate-800 text-xs bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200/80 inline-block shadow-2xs"
                          title={`Dynamic biometric work hours for ${selectedMonthLabel}: ${r.totalWorkHours} hrs`}
                        >
                          {Math.round(r.totalWorkHours * 10) / 10}h
                        </span>
                      </td>
                      {/* Multiplier — EDITABLE */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.5"
                            value={r.multiplier}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val >= 0) {
                                handleRowMultiplierChange(r.empCode, val);
                              }
                            }}
                            className={`w-14 px-1.5 py-1 text-xs font-mono font-bold text-center border-2 rounded-lg outline-none transition-all cursor-text ${
                              r.isMultiplierOverridden
                                ? 'border-indigo-400 bg-indigo-50 text-indigo-700 focus:ring-2 focus:ring-indigo-300'
                                : 'border-indigo-200 bg-indigo-50/50 text-indigo-700 focus:ring-2 focus:ring-indigo-300 hover:border-indigo-300'
                            }`}
                          />
                          <span className="text-[10px] font-bold text-indigo-400">×</span>
                        </div>
                      </td>
                      {/* OT Hours — EDITABLE */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={r.otHours}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              handleRowOtHoursChange(r.empCode, isNaN(val) ? 0 : val);
                            }}
                            className={`w-16 px-1.5 py-1 text-xs font-mono font-bold text-right border-2 rounded-lg outline-none transition-all cursor-text ${
                              r.isOtOverridden
                                ? 'border-violet-500 bg-violet-50 text-violet-700 focus:ring-2 focus:ring-violet-300'
                                : r.otHours > 0
                                ? 'border-violet-300 bg-violet-50/40 text-violet-700 focus:border-violet-500 focus:ring-2 focus:ring-violet-200'
                                : 'border-slate-200 hover:border-violet-300 bg-white text-slate-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-200'
                            }`}
                          />
                          <span className="text-[11px] font-bold text-violet-500">h</span>
                        </div>
                      </td>
                      {/* OT Amount — Formula */}
                      <td className="py-3 px-4 text-right">
                        {otA > 0 ? (
                          <span className="font-mono font-bold text-amber-600 text-xs">
                            +₹{otA.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-mono">₹0</span>
                        )}
                      </td>
                      {/* Final Net Pay — Formula */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-extrabold text-slate-900 text-xs bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200/60 shadow-xs">
                          ₹{final_.toLocaleString('en-IN')}
                        </span>
                      </td>
                      {/* Reset single row button if custom */}
                      <td className="py-3 px-2 text-center">
                        {hasRowOverride && (
                          <button
                            onClick={() => handleResetRow(r.empCode)}
                            title="Reset to default calculated values"
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Summary Footer */}
              <tfoot className="bg-gradient-to-r from-slate-100 to-indigo-50/40 border-t-2 border-slate-300">
                <tr className="text-xs font-extrabold text-slate-800">
                  <td className="py-4 px-4 sticky left-0 bg-gradient-to-r from-slate-100 to-indigo-50/40 z-10" colSpan={1}>
                    <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
                      <Sigma className="w-4 h-4 text-indigo-500" /> Totals
                    </span>
                  </td>
                  <td className="py-4 px-4 sticky left-[100px] bg-gradient-to-r from-slate-100 to-indigo-50/40 z-10 text-slate-500 text-[11px]">
                    {otRows.length} employees
                  </td>
                  <td className="py-4 px-4 text-right"></td>
                  <td className="py-4 px-4 text-right">
                    <span className="font-mono text-emerald-700">₹{totals.totalBaseNet.toLocaleString('en-IN')}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="font-mono text-rose-600">-₹{totals.totalDeductions.toLocaleString('en-IN')}</span>
                  </td>
                  <td className="py-4 px-4 text-right"></td>
                  <td className="py-4 px-4 text-right"></td>
                  <td className="py-4 px-4 text-right">
                    <span className="font-mono">{Math.round(totals.totalHoursWorked * 10) / 10}h</span>
                  </td>
                  <td className="py-4 px-4 text-center"></td>
                  <td className="py-4 px-4 text-right">
                    <span className="font-mono text-violet-700">{Math.round(totals.totalOtHrs * 10) / 10}h</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="font-mono text-amber-700">+₹{totals.totalOtAmt.toLocaleString('en-IN')}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="font-mono font-black text-[#1184b0] text-sm bg-sky-100 px-3 py-1.5 rounded-xl border border-sky-300 shadow-xs">
                      ₹{totals.totalFinal.toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="py-4 px-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

