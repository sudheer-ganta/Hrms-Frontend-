import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, CheckCircle2, AlertCircle, Printer, DollarSign, Calendar } from 'lucide-react';
import { EmployeePayrollSummary } from '../../types';
import { api } from '../../services/api';
import { errorMessage } from '../../lib/apiError';
import { istMonth, monthLabel, monthOptions } from '../../lib/businessDate';
import { PAYSLIP_COMPANY, buildSlipView, dotDate, periodLabel } from '../../lib/payslipLayout';
import { useAuth } from '../../context/AuthContext';

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  empCode: string;
  month?: string; // YYYY-MM (IST); defaults to the current business month
}

/**
 * DISPLAY ONLY. Every amount on the payslip is read from `summary.payslip`, which the backend builds so that
 * earnings - deductions = net pay by construction. Nothing is recalculated here (no PF/PT/LOP math).
 */
export const PayslipModal: React.FC<PayslipModalProps> = ({ isOpen, onClose, empCode, month: initialMonth }) => {
  const { isEmployee } = useAuth();
  const [month, setMonth] = useState<string>(initialMonth ?? istMonth());
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<EmployeePayrollSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const payslipRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (initialMonth) setMonth(initialMonth); }, [initialMonth]);

  useEffect(() => {
    if (!isOpen || !empCode) return;
    let alive = true;
    setLoading(true);
    setEmailStatus(null);
    setLoadError(null);
    api.getEmployeePayroll(empCode, month)
      .then((data) => { if (alive) setSummary(data); })
      .catch((err) => { if (alive) { setSummary(null); setLoadError(errorMessage(err, 'Could not load the payslip.')); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [isOpen, empCode, month]);

  if (!isOpen) return null;

  const handleSendEmail = async () => {
    if (!summary) return;
    if (!summary.email) {
      setEmailStatus({ type: 'error', message: 'No email address registered for this employee. Please update their profile first.' });
      return;
    }
    setEmailSending(true);
    setEmailStatus(null);
    try {
      const res = await api.sendPayslipEmail({ empCode: summary.empCode, month: summary.month, recipientEmail: summary.email });
      setEmailStatus({ type: 'success', message: res.message });
    } catch (err) {
      setEmailStatus({ type: 'error', message: errorMessage(err, 'Failed to dispatch email') });
    } finally {
      setEmailSending(false);
    }
  };

  const p = summary?.payslip;
  const slip = summary && p ? buildSlipView(summary) : null;
  const money = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="payslip-modal relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 bg-[#011638] text-white flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/30"><DollarSign className="w-5 h-5" /></div>
            <div>
              <h3 className="font-heading font-bold text-base leading-tight">Monthly Salary Payslip</h3>
              <p className="text-xs text-sky-200 flex items-center gap-1.5"><Calendar className="w-3 h-3" />{monthLabel(month)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-2 py-1.5 text-xs font-semibold text-slate-800 bg-white rounded-lg border border-slate-200"
              aria-label="Payslip month"
            >
              {monthOptions(12).map((m) => (<option key={m} value={m}>{monthLabel(m)}</option>))}
            </select>
            {!isEmployee && (
              <button
                onClick={handleSendEmail}
                disabled={emailSending || !summary || summary.isProvisional}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1184b0] hover:bg-[#0d6c92] rounded-lg flex items-center space-x-1.5 transition disabled:opacity-50"
                title={summary?.isProvisional ? 'Payslips are emailed only after the month is closed' : 'Email the payslip to the employee'}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{emailSending ? 'Sending...' : 'Email Payslip'}</span>
              </button>
            )}
            <button onClick={() => window.print()} className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg flex items-center space-x-1.5 transition border border-slate-200" title="Print or save as PDF">
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-auto"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {emailStatus && (
          <div className={`px-6 py-2.5 text-xs font-medium flex items-center space-x-2 print:hidden ${emailStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-100' : 'bg-rose-50 text-rose-800 border-b border-rose-100'}`}>
            {emailStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
            <span>{emailStatus.message}</span>
          </div>
        )}

        <div className="p-6 md:p-8 overflow-y-auto bg-slate-50/50 print:bg-white print:p-0">
          {loading ? (
            <div className="p-16 text-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1184b0] mx-auto mb-3" />
              Loading payslip...
            </div>
          ) : loadError || !summary || !p ? (
            <div className="p-12 text-center text-sm text-rose-700">{loadError ?? 'No payslip available.'}</div>
          ) : (
            <div ref={payslipRef} id="payslip-print" className="payslip-sheet bg-white border border-slate-300 shadow-sm text-black">
              {summary.isProvisional && (
                <div className="p-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-semibold print:hidden">
                  Provisional: this month is still open, so these figures can change until payroll is closed.
                </div>
              )}

              <div className="px-6 pt-5 pb-3">
                <div className="flex items-center gap-4">
                  <img src={PAYSLIP_COMPANY.logo} alt="" className="h-16 w-16 shrink-0 object-contain" />
                  <div className="flex-1 text-center pr-16">
                    <h2 className="text-3xl font-bold tracking-wide">{PAYSLIP_COMPANY.name}</h2>
                    <p className="text-[11px] mt-1.5">{PAYSLIP_COMPANY.address}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold mt-3 text-center">Pay Slip for the period of {periodLabel(summary.month)}</p>
              </div>

              <div className="px-6 pb-3 text-[13px]">
                <table className="w-full"><tbody>
                  {([
                    ['Employee Id', summary.empCode],
                    ['Name', summary.name],
                    ['Date Of Joining', dotDate(summary.doj)],
                    ['UAN number', summary.uanNumber],
                    ['ESI IP Number', summary.esiNumber || '0'], // the template prints 0 when the employee has no ESI number
                    ['Designation', summary.designation],
                    ['Total Days', summary.monthDays],
                    ['Days of Worked', summary.payableDays],
                    ['Days Absent', summary.lopDays],
                  ] as const).map(([label, value]) => (
                    <tr key={label}>
                      <td className="py-0.5 w-[55%]">{label}</td>
                      <td className="py-0.5 w-4">:</td>
                      <td className="py-0.5 font-semibold">{value === undefined || value === '' ? '—' : value}</td>
                    </tr>
                  ))}
                </tbody></table>
              </div>

              <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-[560px] text-[13px] border-collapse">
                <thead>
                  <tr className="font-semibold">
                    <th className="border border-black px-2 py-1 text-left w-[28%]">Earnings</th>
                    <th className="border border-black px-2 py-1 text-right w-[11%]">Fixed Wages</th>
                    <th className="border border-black px-2 py-1 text-right w-[11%]">Amount</th>
                    <th className="border border-black px-2 py-1 text-left w-[28%]">Deductions</th>
                    <th className="border border-black px-2 py-1 text-right w-[11%]">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(slip!.earnings.length, slip!.deductions.length) }).map((_, i) => {
                    const e = slip!.earnings[i];
                    const d = slip!.deductions[i];
                    return (
                      <tr key={i}>
                        <td className="border-x border-black px-2 py-0.5">{e?.label ?? ''}</td>
                        <td className="border-x border-black px-2 py-0.5 text-right">{e ? (e.fixed ?? 0) : ''}</td>
                        <td className="border-x border-black px-2 py-0.5 text-right">{e ? e.amount : ''}</td>
                        <td className="border-x border-black px-2 py-0.5">{d?.label ?? ''}</td>
                        <td className="border-x border-black px-2 py-0.5 text-right">{d ? d.amount : ''}</td>
                      </tr>
                    );
                  })}
                  <tr className="font-semibold slip-total">
                    <td className="border border-black px-2 py-1">Total Earnings</td>
                    <td className="border border-black px-2 py-1 text-right">{money(slip!.totalFixed)}</td>
                    <td className="border border-black px-2 py-1 text-right">{money(slip!.totalEarnings)}</td>
                    <td className="border border-black px-2 py-1">Total Deductions</td>
                    <td className="border border-black px-2 py-1 text-right">{money(slip!.totalDeductions)}</td>
                  </tr>
                  <tr className="font-semibold slip-net">
                    <td className="border border-black px-2 py-1" colSpan={2}>Net Pay</td>
                    <td className="border border-black px-2 py-1 text-right" colSpan={3}>{money(slip!.netPay)}</td>
                  </tr>
                </tbody>
              </table>
              </div>

              <div className="px-6 py-4 text-[13px]">
                <span className="font-semibold">Amount in Words: </span>
                <div className="mt-1">{summary.netPayableWords}</div>
              </div>

              <p className="text-center text-[12px] font-semibold pb-4 pt-10">{PAYSLIP_COMPANY.footer}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
