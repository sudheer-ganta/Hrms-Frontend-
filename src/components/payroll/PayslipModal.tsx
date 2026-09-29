import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, CheckCircle2, AlertCircle, Printer, DollarSign, Calendar } from 'lucide-react';
import { EmployeePayrollSummary } from '../../types';
import { api } from '../../services/api';

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  empCode: string;
  month?: string; // YYYY-MM
}

const currentMonthString = () => new Date().toISOString().slice(0, 7);

export const PayslipModal: React.FC<PayslipModalProps> = ({
  isOpen,
  onClose,
  empCode,
  month = currentMonthString(),
}) => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<EmployeePayrollSummary | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const payslipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !empCode) return;

    let isMounted = true;
    setLoading(true);
    setEmailStatus(null);

    api.getEmployeePayroll(empCode, month)
      .then((data) => {
        if (isMounted) setSummary(data);
      })
      .catch((err) => {
        console.error('Error fetching payroll summary:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, empCode, month]);

  if (!isOpen) return null;

  const handlePrintOrDownload = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    if (!summary) return;
    if (!summary.email) {
      setEmailStatus({
        type: 'error',
        message: 'No email address registered for this employee. Please update their profile first.',
      });
      return;
    }

    setEmailSending(true);
    setEmailStatus(null);

    try {
      const res = await api.sendPayslipEmail({
        empCode: summary.empCode,
        month: summary.month,
        recipientEmail: summary.email,
      });

      setEmailStatus({
        type: 'success',
        message: res.message || `Payslip successfully emailed to ${summary.email}`,
      });
    } catch (err: any) {
      setEmailStatus({
        type: 'error',
        message: err?.response?.data?.error || err.message || 'Failed to dispatch email',
      });
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Control Bar (Screen only, hidden on print) */}
        <div className="px-6 py-4 bg-[#011638] text-white flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/30">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base leading-tight">
                Monthly Salary Payslip
              </h3>
              <p className="text-xs text-sky-200">
                Period: <span className="font-semibold text-white">{summary?.month || month}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSendEmail}
              disabled={emailSending || !summary}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1184b0] hover:bg-[#0d6c92] rounded-lg flex items-center space-x-1.5 transition disabled:opacity-50"
              title="Email PDF Payslip to Employee"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{emailSending ? 'Sending...' : 'Email Payslip'}</span>
            </button>

            <button
              onClick={handlePrintOrDownload}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg flex items-center space-x-1.5 transition border border-slate-200"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-auto"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Email Notification Alert Banner */}
        {emailStatus && (
          <div
            className={`px-6 py-2.5 text-xs font-medium flex items-center space-x-2 print:hidden ${
              emailStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-100'
                : 'bg-rose-50 text-rose-800 border-b border-rose-100'
            }`}
          >
            {emailStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{emailStatus.message}</span>
          </div>
        )}

        {/* Payslip Document Body */}
        <div className="p-6 md:p-8 overflow-y-auto bg-slate-50/50 print:bg-white print:p-0">
          {loading || !summary ? (
            <div className="p-16 text-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1184b0] mx-auto mb-3"></div>
              Calculating attendance and generating payslip...
            </div>
          ) : (
            <div
              ref={payslipRef}
              className="bg-white rounded-xl p-6 md:p-8 border border-slate-200 shadow-sm print:border-none print:shadow-none space-y-6"
            >
              {/* Company Header */}
              <div className="border-b-2 border-slate-800 pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl font-heading font-extrabold text-[#011638] tracking-tight">
                      ColorMyles
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#1184b0] text-white rounded">
                      HRMS
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official Salary & Attendance Statement • Bangalore, India
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Payslip Period</div>
                  <div className="text-base font-bold text-slate-800">{summary.month}</div>
                </div>
              </div>

              {/* Employee Metadata Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Employee Code</span>
                  <span className="font-mono font-bold text-slate-800">{summary.empCode}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Employee Name</span>
                  <span className="font-bold text-slate-800">{summary.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Department</span>
                  <span className="font-semibold text-slate-700">{summary.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Designation</span>
                  <span className="font-semibold text-slate-700">{summary.designation}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Location</span>
                  <span className="font-semibold text-slate-700">{summary.location}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Date of Birth (DOB)</span>
                  <span className="font-semibold text-slate-700">{summary.dob || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Email Address</span>
                  <span className="font-semibold text-slate-700 truncate block">{summary.email || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Bank A/C</span>
                  <span className="font-mono font-semibold text-slate-700">{summary.bankAccount || '—'}</span>
                </div>
              </div>

              {/* Attendance & Shift Breakdown Box */}
              <div className="bg-sky-50/60 p-4 rounded-xl border border-sky-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-900 mb-2.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#1184b0]" /> Monthly Attendance & Overtime Summary
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-lg border border-sky-100">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Month Days</span>
                    <span className="font-bold text-slate-800 text-sm">{summary.monthDays}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-sky-100">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Present Days</span>
                    <span className="font-bold text-emerald-600 text-sm">{summary.presentDays}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-sky-100">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Half Days</span>
                    <span className="font-bold text-amber-600 text-sm">{summary.halfDays}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-sky-100">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">LOP (Absent)</span>
                    <span className="font-bold text-rose-600 text-sm">{summary.lopDays}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-sky-100">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Paid Days</span>
                    <span className="font-bold text-[#1184b0] text-sm">{summary.payableDays}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-sky-100">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Work Hours</span>
                    <span className="font-bold text-indigo-600 text-sm">{summary.totalWorkHours}h</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-sky-100">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">OT Hours</span>
                    <span className="font-bold text-violet-600 text-sm">{summary.totalOtHours}h</span>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Dual Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Earnings */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-900 border-b border-emerald-100 uppercase tracking-wider flex justify-between">
                    <span>Earnings Component</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="p-3 space-y-2 text-xs divide-y divide-slate-100">
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-600">Basic (A)</span>
                      <span className="font-semibold text-slate-800">₹{summary.basicSalary.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between pt-1.5">
                      <span className="text-slate-600">HRA (C1)</span>
                      <span className="font-semibold text-slate-800">₹{summary.hra.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between pt-1.5">
                      <span className="text-slate-600">Special Allowance (C2)</span>
                      <span className="font-semibold text-slate-800">₹{summary.allowances.toLocaleString('en-IN')}</span>
                    </div>
                    {summary.otEarnings > 0 && (
                      <div className="flex justify-between pt-1.5 text-violet-700 font-semibold">
                        <span className="flex items-center gap-1">
                          Overtime Pay (OT)
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 font-mono">
                            {summary.totalOtHours}h @ ₹{summary.otRatePerHour}/h
                          </span>
                        </span>
                        <span>+₹{summary.otEarnings.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {(summary.sundayEarnings ?? 0) > 0 && (
                      <div className="flex justify-between pt-1.5 text-violet-700 font-semibold">
                        <span className="flex items-center gap-1">
                          Sunday Working
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 font-mono">
                            {summary.sundayDays} day(s) @ 2x
                          </span>
                        </span>
                        <span>+₹{(summary.sundayEarnings ?? 0).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t-2 border-slate-200 font-bold text-slate-900">
                      <span>Gross Salary (D)</span>
                      <span>₹{summary.grossEarnings.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-rose-50 px-4 py-2 text-xs font-bold text-rose-900 border-b border-rose-100 uppercase tracking-wider flex justify-between">
                    <span>Deductions Component</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="p-3 space-y-2 text-xs divide-y divide-slate-100">
                    {summary.lopDays > 0 && (
                      <div className="flex justify-between pt-1 text-rose-600">
                        <span className="font-medium">Loss of Pay (LOP) [{summary.lopDays} Days]</span>
                        <span className="font-bold">-₹{summary.lopDeduction.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1.5">
                      <span className="text-slate-600">Employee PF (E - 12%)</span>
                      <span className="font-semibold text-slate-800">
                        {summary.pfDeduction > 0 ? `₹${summary.pfDeduction.toLocaleString('en-IN')}` : `₹${Math.min(1800, Math.round(summary.basicSalary * 0.12)).toLocaleString('en-IN')}`}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1.5">
                      <span className="text-slate-600">Employee ESIC (F)</span>
                      <span className="font-semibold text-slate-800">
                        {summary.esiDeduction > 0 ? `₹${summary.esiDeduction.toLocaleString('en-IN')}` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1.5">
                      <span className="text-slate-600">PT (Professional Tax) (J)</span>
                      <span className="font-semibold text-slate-800">
                        {summary.monthlyCtc >= 15000 ? '₹200' : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t-2 border-slate-200 font-bold text-rose-700">
                      <span>Total Deductions</span>
                      <span>-₹{summary.totalDeductions.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Employer Contributions & CTC Summary (Annexure K Statutory) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 text-slate-600">
                  <span>Employer PF (H): <strong className="text-slate-900 font-mono">₹{(summary.employerPf ?? summary.pfDeduction ?? 1800).toLocaleString('en-IN')}</strong></span>
                  <span>•</span>
                  <span>Employer ESIC (I): <strong className="text-slate-900 font-mono">{summary.employerEsic && summary.employerEsic > 0 ? `₹${summary.employerEsic.toLocaleString('en-IN')}` : '—'}</strong></span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Monthly CTC (Cost to Company)</span>
                  <span className="font-mono font-extrabold text-slate-900 text-sm">₹{summary.monthlyCtc.toLocaleString('en-IN')} / month</span>
                </div>
              </div>

              {/* Net Pay Highlight Banner */}
              <div className="bg-gradient-to-r from-[#011638] to-[#1184b0] text-white p-5 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
                <div>
                  <div className="text-xs uppercase tracking-widest text-sky-200 font-bold">
                    Net Take-Home Salary
                  </div>
                  <div className="text-xs text-sky-100 mt-0.5 italic">
                    {summary.netPayableWords}
                  </div>
                </div>
                <div className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight">
                  ₹{summary.netPayable.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Footer Stamp & Signatures */}
              <div className="pt-6 border-t border-slate-200 text-slate-500 text-[11px] flex justify-between items-end">
                <div>
                  <p>Generated automatically by ColorMyles HRMS.</p>
                  <p className="text-[10px] text-slate-400">Confidential Document • For employee personal records only.</p>
                </div>
                <div className="text-right">
                  <div className="w-32 border-b border-slate-300 mb-1"></div>
                  <p className="font-semibold text-slate-700">Authorized Signatory</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
