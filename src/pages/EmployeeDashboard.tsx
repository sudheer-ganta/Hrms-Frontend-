import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Plus, Building2, PartyPopper, FileText, ChevronRight, Coffee, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useDataVersion } from '../services/dataSync';
import { errorMessage } from '../lib/apiError';
import { formatBusinessDate, formatBusinessDay, istMonth, istToday, monthLabel } from '../lib/businessDate';
import { formatMinutes, metaFor } from '../lib/attendanceDisplay';
import { inr } from '../lib/utils';
import type { AttendanceDay, AttendanceRegularizationRequest, EmployeePayrollSummary, EmployeeProfile, HRMSPolicySettings } from '../types';
import { EmployeePunchCard } from '../components/attendance/EmployeePunchCard';
import { AttendanceCalendar } from '../components/attendance/AttendanceCalendar';
import { DayAdjustmentModal } from '../components/attendance/DayAdjustmentModal';
import { PayslipModal } from '../components/payroll/PayslipModal';

/**
 * Employee home. Every number and every day verdict comes from the backend (same source as the
 * portal, the admin screens and payroll). Leave / regularization requests are filed in the portal.
 */
export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const empCode = user?.empCode || '';
  const month = istMonth();
  const today = istToday();

  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [payroll, setPayroll] = useState<EmployeePayrollSummary | null>(null);
  const [days, setDays] = useState<AttendanceDay[]>([]);
  const [requests, setRequests] = useState<AttendanceRegularizationRequest[]>([]);
  const [policy, setPolicy] = useState<HRMSPolicySettings | null>(null);
  const [selectedDay, setSelectedDay] = useState<AttendanceDay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

  const load = useCallback(async () => {
    if (!empCode) return;
    setError(null);
    const keep = async <T,>(p: Promise<T>): Promise<T | null> => p.catch((e) => { setError(errorMessage(e)); return null; });
    const [prof, pay, cal, reqs, pol] = await Promise.all([
      keep(api.getEmployeeProfile(empCode)),
      keep(api.getEmployeePayroll(empCode, month)),
      keep(api.getAttendanceCalendar(month, empCode)),
      keep(api.getRequests({ empCode })),
      keep(api.getPolicySettings()),
    ]);
    setProfile(prof);
    setPayroll(pay);
    setDays(cal?.days ?? []);
    setRequests(reqs ?? []);
    setPolicy(pol);
  }, [empCode, month]);

  const dataVersion = useDataVersion();
  useEffect(() => { void load(); }, [load, dataVersion]);

  const todayDay = days.find((d) => d.businessDate === today);
  const upcomingHolidays = (policy?.holidays ?? []).filter((h) => h.date >= today && h.paid).slice(0, 4);
  const recent = days.filter((d) => d.status !== null && (d.firstIn || d.lastOut || d.manualOverride)).slice(-7).reverse();
  const pending = requests.filter((r) => r.status === 'PENDING');

  return (
    <div className="space-y-6 font-sans">
      {error && <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">{error}</div>}

      <div className="bg-gradient-to-r from-[#011638] via-[#093554] to-[#1184b0] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-[#011638]/20 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-5">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-extrabold text-2xl">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : 'E'}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-500/30">ID: #{empCode}</span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-heading mt-1">Welcome, {profile?.name ?? user?.name}</h1>
              <p className="text-xs text-sky-100/80 font-medium flex flex-wrap items-center gap-2 mt-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>{[profile?.department, todayDay?.siteName ?? profile?.location].filter(Boolean).join(' • ') || 'ColorMyles'}</span>
                {policy && (<><span>•</span><span>{policy.shift.shiftName} ({policy.shift.startTime} - {policy.shift.endTime})</span></>)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Link to="/portal" className="px-4 py-2.5 bg-white text-[#011638] hover:bg-sky-50 text-xs font-bold rounded-xl shadow-md flex items-center gap-2"><Plus className="w-4 h-4 text-[#1184b0]" /><span>Apply Leave</span></Link>
            <Link to="/portal" className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 flex items-center gap-2"><Clock className="w-4 h-4 text-sky-300" /><span>Regularize / WFH</span></Link>
          </div>
        </div>
      </div>

      <EmployeePunchCard empCode={empCode} empName={profile?.name} onPunchSuccess={() => void load()} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          ['Payable Days', payroll ? `${payroll.payableDays}d` : '—', payroll ? `of ${payroll.elapsedDays}d elapsed` : '', 'text-emerald-600'],
          ['Loss of Pay', payroll ? `${payroll.lopDays}d` : '—', payroll ? `${payroll.halfDays} half-day` : '', 'text-rose-600'],
          ['Overtime', payroll ? `${payroll.totalOtHours}h` : '—', payroll && payroll.otEarnings > 0 ? `+${inr(payroll.otEarnings)}` : '0 OT pay', 'text-violet-600'],
          [payroll?.isProvisional === false ? 'Net Pay' : 'Net Pay So Far', payroll && payroll.monthlyCtc > 0 ? inr(payroll.netPayable) : '—', payroll?.isProvisional ? 'Provisional' : '', 'text-[#1184b0]'],
        ].map(([label, value, sub, color]) => (
          <div key={label} className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{label}</span>
            <span className={`text-2xl font-heading font-extrabold mt-1 block ${color}`}>{value}</span>
            <span className="text-[10px] text-slate-500">{sub}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-heading font-bold text-slate-900">{monthLabel(month)}</h2>
              <Link to="/portal" className="text-xs font-bold text-[#1184b0] flex items-center gap-1">Full portal <ChevronRight className="w-3.5 h-3.5" /></Link>
            </div>
            <AttendanceCalendar days={days} />
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card space-y-3">
            <h2 className="text-sm font-heading font-bold text-slate-900 flex items-center gap-2"><Clock className="w-4 h-4 text-[#1184b0]" /> Recent days</h2>
            {recent.length === 0 && <p className="text-xs text-slate-400">No attendance recorded yet this month.</p>}
            {recent.map((d) => {
              const meta = metaFor(d.status);
              return (
                <div
                  key={d.businessDate}
                  onClick={() => setSelectedDay(d)}
                  className="p-3 rounded-xl border border-slate-200/80 flex items-center justify-between cursor-pointer hover:bg-sky-50/40 hover:border-sky-300 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-8 rounded-lg border flex items-center justify-center font-bold text-xs ${meta.cell}`}>{meta.short}</div>
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 group-hover:text-brand-600 transition-colors">{formatBusinessDay(d.businessDate)}</span>
                      <span className="ml-2 text-[10px] text-slate-500">{d.statusLabel}{d.isLate ? ' · late' : ''}</span>
                      <div className="text-[11px] text-slate-500">In {d.firstIn ?? '--:--'} · Out {d.lastOut ?? '--:--'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800 block">{formatMinutes(d.workMinutes)}h</span>
                    <span className="text-[10px] text-brand-600 font-semibold group-hover:underline">Details / WFH</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card space-y-3">
            <h2 className="text-sm font-heading font-bold text-slate-900 flex items-center gap-2"><FileText className="w-4 h-4 text-[#1184b0]" /> My requests</h2>
            {requests.length === 0 && <p className="text-xs text-slate-400">No requests yet.</p>}
            {requests.slice(0, 5).map((r) => (
              <div key={r.id} className="text-xs flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-700">{r.requestType === 'LEAVE' ? 'Leave' : r.requestType === 'MISSED_PUNCH' ? 'Missed punch' : r.requestType === 'WORK_FROM_HOME' ? 'WFH' : 'On duty'} · {formatBusinessDate(r.date)}</span>
                <span className="font-bold text-slate-600">{r.status === 'APPLIED' ? 'Approved' : r.status.charAt(0) + r.status.slice(1).toLowerCase()}</span>
              </div>
            ))}
            {pending.length > 0 && <p className="text-[11px] text-amber-700">{pending.length} awaiting approval</p>}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card space-y-3">
            <h2 className="text-sm font-heading font-bold text-slate-900 flex items-center gap-2"><PartyPopper className="w-4 h-4 text-purple-600" /> Upcoming holidays</h2>
            {upcomingHolidays.length === 0 && <p className="text-xs text-slate-400 flex items-center gap-1.5"><Coffee className="w-3.5 h-3.5" /> None scheduled.</p>}
            {upcomingHolidays.map((h) => (
              <div key={h.id} className="text-xs flex items-center justify-between"><span className="font-semibold text-slate-800">{h.name}</span><span className="text-slate-500">{formatBusinessDate(h.date)}</span></div>
            ))}
          </div>

          <button type="button" onClick={() => setIsPayslipOpen(true)} className="w-full py-3 bg-[#011638] hover:bg-[#02245b] text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2"><DollarSign className="w-4 h-4 text-sky-400" /> View payslips</button>
        </div>
      </div>

      {isPayslipOpen && <PayslipModal isOpen onClose={() => setIsPayslipOpen(false)} empCode={empCode} />}
      <DayAdjustmentModal isOpen={Boolean(selectedDay)} onClose={() => setSelectedDay(null)} day={selectedDay} onSaved={() => void load()} />
    </div>
  );
};
