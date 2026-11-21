import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Download, Info, Lock, RefreshCw, Unlock, Wallet,
} from 'lucide-react';
import { api, refreshApiData } from '../services/api';
import { useDataVersion } from '../services/dataSync';
import { useAuth } from '../context/AuthContext';
import { addMonths, formatInstantIst, istMonth, monthLabel } from '../lib/businessDate';
import { errorMessage } from '../lib/apiError';
import { downloadCsvFile } from '../lib/payrollExport';
import { buildPaySheetCsv, buildPaySteps, pendingForMonth, stepsNeedingAttention, summarizePay } from '../lib/payRun';
import type { PayStep } from '../lib/payRun';
import type { AttendanceCoverage, AttendanceRegularizationRequest, EmployeePayrollSummary, PayrollRunStatus } from '../types';
import { PayrollCloseReviewModal } from '../components/settings/PayrollCloseReviewModal';
import { ErrorAlert } from '../components/common/ErrorAlert';

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

interface MonthData {
  month: string;
  rows: EmployeePayrollSummary[];
  coverage: AttendanceCoverage;
  requests: AttendanceRegularizationRequest[];
  run: PayrollRunStatus;
}

const StepIcon: React.FC<{ state: PayStep['state'] }> = ({ state }) =>
  state === 'done' ? <CheckCircle2 className="w-7 h-7 text-emerald-500 shrink-0" aria-label="Done" />
  : state === 'warn' ? <AlertTriangle className="w-7 h-7 text-amber-500 shrink-0" aria-label="Needs a look" />
  : <Info className="w-7 h-7 text-sky-500 shrink-0" aria-label="For your information" />;

export const PayRun: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const dataVersion = useDataVersion();
  const thisMonth = istMonth();
  // The month most people are paying is the one that just ended; during the first days of a month show that one.
  const [month, setMonth] = useState<string>(() => addMonths(thisMonth, -1));
  const [data, setData] = useState<MonthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reviewOpen, setReviewOpen] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const latest = useRef(0);

  const load = useCallback(async (m: string) => {
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const [rows, coverage, requests, run] = await Promise.all([
        api.getAllPayroll(m),
        api.getPayrollCoverage(m),
        api.getRequests({ status: 'PENDING' }),
        api.getPayrollRunStatus(m),
      ]);
      if (id !== latest.current) return; // a newer month owns the screen
      setData({ month: m, rows, coverage, requests, run });
    } catch (err) {
      if (id === latest.current) setError(errorMessage(err, 'Could not load this month.'));
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, []);

  // Reloads on a month change and whenever anything anywhere in the app changed (leave approved, attendance synced…).
  useEffect(() => { void load(month); }, [month, dataVersion, load]);

  const shown = data && data.month === month ? data : null;
  const locked = shown?.run.status === 'CLOSED';
  const totals = shown ? summarizePay(shown.rows) : null;
  const steps = shown
    ? buildPaySteps({ rows: shown.rows, missingDates: shown.coverage.missingDates, workingDays: shown.coverage.workingDays, pendingRequests: pendingForMonth(shown.requests, month) })
    : [];
  const needAttention = stepsNeedingAttention(steps);
  const stillRunning = month >= thisMonth;

  const reopen = async () => {
    const reason = window.prompt(`Open ${monthLabel(month)} again?\n\nSalaries will be calculated live again until you lock the month once more. The earlier locked copy is kept.\n\nWrite the reason (at least 5 letters):`);
    if (!reason || reason.trim().length < 5) return;
    setBusy(true);
    try {
      await api.reopenPayrollMonth(month, reason.trim());
      await load(month);
    } catch (err) {
      setError(errorMessage(err, 'Could not open the month again.'));
    } finally {
      setBusy(false);
    }
  };

  const downloadSheet = () => {
    if (!shown) return;
    downloadCsvFile(buildPaySheetCsv(shown.rows, monthLabel(month), !!locked), `ColorMyles_Salary_${month}.csv`);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-brand-500" />
            Pay Salary
          </h1>
          <p className="text-sm text-slate-600 mt-1">Go down the steps one by one. When all steps are green, lock the month.</p>
        </div>
        <button
          type="button"
          onClick={() => { refreshApiData(); void load(month); }}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:text-brand-600 shadow-card disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Month picker */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-3 shadow-card">
        <button type="button" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month" className="p-3 rounded-xl hover:bg-slate-100 text-slate-700">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <div className="text-xl font-heading font-extrabold text-slate-900">{monthLabel(month)}</div>
          {month !== addMonths(thisMonth, -1) && (
            <button type="button" onClick={() => setMonth(addMonths(thisMonth, -1))} className="text-xs font-semibold text-brand-600 hover:underline">Go to last month</button>
          )}
        </div>
        <button type="button" onClick={() => setMonth(addMonths(month, 1))} disabled={month >= thisMonth} aria-label="Next month" className="p-3 rounded-xl hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {error && <ErrorAlert title="Could not load this month" message={error} onRetry={() => { refreshApiData(); void load(month); }} />}

      {!shown && !error && <div className="py-16 text-center text-sm text-slate-500" role="status">Loading {monthLabel(month)}…</div>}

      {shown && totals && (
        <>
          {/* Locked / open banner */}
          <div className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${locked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200/80 shadow-card'}`}>
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-xl ${locked ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {locked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
              </div>
              <div>
                <div className="text-base font-heading font-bold text-slate-900">
                  {locked ? 'This month is locked' : stillRunning ? 'This month is still running' : 'This month is not locked yet'}
                </div>
                <p className="text-sm text-slate-600 mt-0.5">
                  {locked
                    ? `Locked by ${shown.run.closedBy ?? 'someone'} on ${formatInstantIst(shown.run.closedAt)}. The numbers below can no longer change.`
                    : 'Numbers below are live and can still change until you lock the month.'}
                </p>
              </div>
            </div>
            {locked && isSuperAdmin && (
              <button type="button" onClick={reopen} disabled={busy} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-amber-300 text-amber-800 rounded-xl text-sm font-bold hover:bg-amber-50 disabled:opacity-60 shrink-0">
                <Unlock className="w-4 h-4" />
                {busy ? 'Opening…' : 'Open again'}
              </button>
            )}
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-card">
              <div className="text-xs font-bold text-slate-500">People to pay</div>
              <div className="text-2xl font-heading font-extrabold text-slate-900 mt-1">{totals.paidPeople}</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="text-xs font-bold text-emerald-700">Total to pay</div>
              <div className="text-2xl font-heading font-extrabold text-emerald-700 mt-1">{rupees(totals.netPay)}</div>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-card">
              <div className="text-xs font-bold text-slate-500">PF + ESI cut</div>
              <div className="text-2xl font-heading font-extrabold text-slate-900 mt-1">{rupees(totals.pf + totals.esi)}</div>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-card">
              <div className="text-xs font-bold text-slate-500">Overtime & extra pay</div>
              <div className="text-2xl font-heading font-extrabold text-slate-900 mt-1">{rupees(totals.extraPay)}</div>
            </div>
          </div>

          {/* Steps */}
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={s.id} className={`rounded-2xl border p-4 sm:p-5 flex items-start gap-4 ${s.state === 'warn' && !locked ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200/80 shadow-card'}`}>
                <StepIcon state={s.state} />
                <div className="flex-1 min-w-0">
                  <div className="text-base font-heading font-bold text-slate-900">
                    <span className="text-slate-400 mr-1.5">Step {i + 1}.</span>{s.title}
                  </div>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{s.detail}</p>
                  {s.to && s.actionLabel && (s.state !== 'done') && (
                    <Link to={s.to} className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-800 hover:border-brand-500 hover:text-brand-600">
                      {s.actionLabel}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </li>
            ))}

            {/* Final step: lock */}
            <li className="rounded-2xl border border-slate-200/80 bg-white shadow-card p-4 sm:p-5 flex items-start gap-4">
              {locked ? <CheckCircle2 className="w-7 h-7 text-emerald-500 shrink-0" /> : <Lock className="w-7 h-7 text-slate-400 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-base font-heading font-bold text-slate-900"><span className="text-slate-400 mr-1.5">Step {steps.length + 1}.</span>Check and lock the month</div>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  {locked
                    ? 'Done. Salary slips for this month are final.'
                    : stillRunning
                    ? 'The month has not ended yet, so days still to come are not counted. Lock it after the last day.'
                    : needAttention > 0
                    ? `${needAttention === 1 ? '1 step above still needs a look' : `${needAttention} steps above still need a look`}. You can lock anyway, but fixing them first is safer.`
                    : 'Everything looks right. You will see every person\'s pay once more before it is locked.'}
                </p>
                <div className="flex flex-wrap gap-3 mt-3">
                  {!locked && (
                    <button type="button" onClick={() => setReviewOpen(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-base text-white text-sm font-heading font-bold shadow-md shadow-brand-500/20 hover:opacity-95 active:scale-95 ">
                      <Lock className="w-4 h-4" />
                      Check and lock {monthLabel(month)}
                    </button>
                  )}
                  <button type="button" onClick={downloadSheet} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-800 hover:border-brand-500 hover:text-brand-600">
                    <Download className="w-4 h-4" />
                    Download salary sheet
                  </button>
                </div>
              </div>
            </li>
          </ol>
        </>
      )}

      <PayrollCloseReviewModal
        month={month}
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onConfirmed={() => { setReviewOpen(false); void load(month); }}
      />
    </div>
  );
};
