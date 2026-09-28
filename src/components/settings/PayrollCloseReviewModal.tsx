import React, { useState, useEffect } from 'react';
import { X, Lock, AlertTriangle, Users, IndianRupee, ShieldAlert } from 'lucide-react';
import { api } from '../../services/api';
import { EmployeePayrollSummary } from '../../types';

interface PayrollCloseReviewModalProps {
  month: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirmed: () => void;
}

// A "review before lock" step, matching how Zoho Payroll's Pay Run works: you see
// the computed numbers for everyone first — including who has no salary configured
// at all — and only lock them in once you've actually looked, instead of freezing
// whatever the live numbers happen to be the moment you click a single button.
export const PayrollCloseReviewModal: React.FC<PayrollCloseReviewModalProps> = ({
  month,
  isOpen,
  onClose,
  onConfirmed,
}) => {
  const [summaries, setSummaries] = useState<EmployeePayrollSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api.getAllPayroll(month)
      .then((data) => {
        if (isMounted) {
          setSummaries([...data].sort((a, b) => (b.netPayable || 0) - (a.netPayable || 0)));
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.response?.data?.error || err.message || 'Failed to load payroll preview');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, month]);

  if (!isOpen) return null;

  const totalEmployees = summaries.length;
  const configured = summaries.filter((s) => s.monthlyCtc > 0);
  const unconfigured = summaries.filter((s) => !s.monthlyCtc || s.monthlyCtc <= 0);
  const totalNetPay = configured.reduce((sum, s) => sum + (s.netPayable || 0), 0);

  const handleConfirm = async () => {
    setIsConfirming(true);
    setError(null);
    try {
      await api.closePayrollMonth(month);
      onConfirmed();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to close payroll month');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-100 text-brand-600 rounded-xl shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-heading font-bold text-slate-900">Review {month} Payroll Before Locking</h2>
              <p className="text-xs text-slate-500 font-sans">
                Check every number below — once you confirm, these figures are permanent.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-slate-400 font-medium">Loading {month} payroll…</div>
          ) : (
            <>
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Summary stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <Users className="w-3.5 h-3.5" /> Employees
                  </span>
                  <span className="text-xl font-heading font-extrabold text-slate-900 block mt-1">{totalEmployees}</span>
                </div>
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                    <IndianRupee className="w-3.5 h-3.5" /> Total Net Pay
                  </span>
                  <span className="text-xl font-heading font-extrabold text-emerald-700 block mt-1">
                    ₹{totalNetPay.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className={`p-3.5 rounded-xl border ${unconfigured.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${unconfigured.length > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                    <ShieldAlert className="w-3.5 h-3.5" /> No Salary Set
                  </span>
                  <span className={`text-xl font-heading font-extrabold block mt-1 ${unconfigured.length > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                    {unconfigured.length}
                  </span>
                </div>
              </div>

              {unconfigured.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {unconfigured.length} employee{unconfigured.length === 1 ? '' : 's'} have no CTC configured and will
                    lock at ₹0 net pay. If that's not intentional, cancel this, set their salary in Employees &amp; CTC
                    first, then come back to close the month.
                  </span>
                </div>
              )}

              {/* Employee table */}
              <div className="rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 text-[10px] sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Emp Code</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3 text-right">Payable Days</th>
                      <th className="py-2.5 px-3 text-right">LOP Days</th>
                      <th className="py-2.5 px-3 text-right">Net Pay (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {summaries.map((s) => (
                      <tr key={s.empCode} className={s.monthlyCtc > 0 ? '' : 'bg-amber-50/40'}>
                        <td className="py-2 px-3 font-mono font-bold text-brand-600">{s.empCode}</td>
                        <td className="py-2 px-3 truncate max-w-[160px]">{s.name}</td>
                        <td className="py-2 px-3 text-right font-mono">{s.payableDays}</td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600">{s.lopDays}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {s.monthlyCtc > 0 ? `₹${s.netPayable.toLocaleString('en-IN')}` : (
                            <span className="text-amber-600 italic font-normal">Not Configured</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || isConfirming || totalEmployees === 0}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-heading font-bold text-white bg-gradient-to-r from-brand-500 to-brand-base hover:opacity-95 rounded-xl shadow-md shadow-brand-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isConfirming ? 'Locking…' : `Confirm & Lock ${month}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
