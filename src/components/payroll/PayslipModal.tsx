import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, CheckCircle2, AlertCircle, Printer, DollarSign, Calendar } from 'lucide-react';
import { EmployeePayrollSummary } from '../../types';
import { api } from '../../services/api';
import { errorMessage } from '../../lib/apiError';
import { istMonth, monthLabel, monthOptions } from '../../lib/businessDate';
import { inr } from '../../lib/utils';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
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
            <div ref={payslipRef} className="bg-white rounded-xl p-6 md:p-8 border border-slate-200 shadow-sm print:border-none print:shadow-none space-y-6">
              {summary.isProvisional && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                  Provisional: this month is still open, so these figures can change until payroll is closed.
                </div>
              )}

              <div className="border-b-2 border-slate-800 pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl font-heading font-extrabold text-[#011638] tracking-tight">ColorMyles</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#1184b0] text-white rounded">HRMS</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Salary & Attendance Statement</p>
                </div>
                <div className="text-left md:text-right">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Payslip Period</div>
                  <div className="text-base font-bold text-slate-800">{monthLabel(summary.month)}</div>
                  {!summary.isProvisional && <div className="text-[10px] text-slate-400">Final · version {summary.snapshotVersion}</div>}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                {([
                  ['Employee Code', summary.empCode, true],
                  ['Employee Name', summary.name, false],
                  ['Department', summary.department, false],
                  ['Designation', summary.designation, false],
                  ['Location', summary.location, false],
                  ['Date of Birth', summary.dob, false],
                  ['Email', summary.email, false],
                  ['Bank A/C', summary.bankAccount ? `${'*'.repeat(Math.max(0, summary.bankAccount.length - 4))}${summary.bankAccount.slice(-4)}` : undefined, true],
                ] as const).map(([label, value, mono]) => (
                  <div key={label}>
                    <span className="text-slate-400 block font-medium">{label}</span>
                    <span className={`font-semibold text-slate-800 truncate block ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
                  </div>
                ))}
              </div>

              <div className="bg-sky-50/60 p-4 rounded-xl border border-sky-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-900 mb-2.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-[#1184b0]" /> Attendance & Overtime Summary</h4>
                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 text-center text-xs">
                  {([
                    ['Month Days', summary.monthDays, 'text-slate-800'],
                    ['Present', summary.presentDays, 'text-emerald-600'],
                    ['Half Days', summary.halfDays, 'text-amber-600'],
                    ['Paid Leave', summary.leaveDays, 'text-sky-600'],
                    ['LOP Days', summary.lopDays, 'text-rose-600'],
                    ['Paid Days', summary.payableDays, 'text-[#1184b0]'],
                    ['OT Hours', `${summary.totalOtHours}h`, 'text-violet-600'],
                  ] as const).map(([label, value, color]) => (
                    <div key={label} className="bg-white p-2 rounded-lg border border-sky-100">
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">{label}</span>
                      <span className={`font-bold text-sm ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-900 border-b border-emerald-100 uppercase tracking-wider flex justify-between"><span>Earnings</span><span>Amount (₹)</span></div>
                  <div className="p-3 space-y-2 text-xs divide-y divide-slate-100">
                    {p.earnings.map((l) => (
                      <div key={l.code} className="flex justify-between pt-1.5 first:pt-0">
                        <span className="text-slate-600">{l.label}{l.note && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-mono">{l.note}</span>}</span>
                        <span className="font-semibold text-slate-800">{inr(l.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t-2 border-slate-200 font-bold text-slate-900"><span>Total Earnings</span><span>{inr(p.totalEarnings)}</span></div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-rose-50 px-4 py-2 text-xs font-bold text-rose-900 border-b border-rose-100 uppercase tracking-wider flex justify-between"><span>Deductions</span><span>Amount (₹)</span></div>
                  <div className="p-3 space-y-2 text-xs divide-y divide-slate-100">
                    {p.deductions.length === 0 && <div className="text-slate-400">No deductions</div>}
                    {p.deductions.map((l) => (
                      <div key={l.code} className="flex justify-between pt-1.5 first:pt-0">
                        <span className="text-slate-600">{l.label}{l.note && <span className="ml-1.5 text-[10px] text-slate-400">({l.note})</span>}</span>
                        <span className="font-semibold text-rose-700">-{inr(l.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t-2 border-slate-200 font-bold text-rose-700"><span>Total Deductions</span><span>-{inr(p.totalDeductions)}</span></div>
                  </div>
                </div>
              </div>

              {p.employerBorne.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Employer contributions (not deducted from your pay)</div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-600">
                    {p.employerBorne.map((l) => (<span key={l.code}>{l.label}: <strong className="text-slate-900 font-mono">{inr(l.amount)}</strong></span>))}
                    <span>Monthly CTC: <strong className="text-slate-900 font-mono">{inr(summary.monthlyCtc)}</strong></span>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-r from-[#011638] to-[#1184b0] text-white p-5 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
                <div>
                  <div className="text-xs uppercase tracking-widest text-sky-200 font-bold">Net Take-Home Salary</div>
                  <div className="text-xs text-sky-100 mt-0.5 italic">{summary.netPayableWords}</div>
                </div>
                <div className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight">{inr(p.netPay)}</div>
              </div>

              <div className="pt-6 border-t border-slate-200 text-slate-500 text-[11px] flex justify-between items-end">
                <div>
                  <p>Generated by ColorMyles HRMS.</p>
                  <p className="text-[10px] text-slate-400">Confidential document. For the employee's personal records only.</p>
                </div>
                <div className="text-right"><div className="w-32 border-b border-slate-300 mb-1" /><p className="font-semibold text-slate-700">Authorized Signatory</p></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
