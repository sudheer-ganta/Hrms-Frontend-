import React, { useState, useEffect, useCallback } from 'react';
import { X, User, Building2, Clock, TrendingUp, CalendarCheck, Edit3, DollarSign } from 'lucide-react';
import { AttendanceDay, EmployeeProfile, EmployeePayrollSummary, HRMSPolicySettings } from '../../types';
import { api } from '../../services/api';
import { useDataVersion } from '../../services/dataSync';
import { EditEmployeeModal } from './EditEmployeeModal';
import { PayslipModal } from '../payroll/PayslipModal';
import { AttendanceCalendar } from '../attendance/AttendanceCalendar';
import { DayAdjustmentModal } from '../attendance/DayAdjustmentModal';
import { formatMinutes, metaFor } from '../../lib/attendanceDisplay';
import { formatBusinessDay, istMonth } from '../../lib/businessDate';
import { inr } from '../../lib/utils';

interface EmployeeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employee: { employeeCode: string; employeeName: string; siteName: string } | null;
}

export const EmployeeDrawer: React.FC<EmployeeDrawerProps> = ({ isOpen, onClose, employee }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'calendar'>('overview');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [payroll, setPayroll] = useState<EmployeePayrollSummary | null>(null);
  const [days, setDays] = useState<AttendanceDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<AttendanceDay | null>(null);
  const [policy, setPolicy] = useState<HRMSPolicySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const month = istMonth();
  const dataVersion = useDataVersion();

  const load = useCallback(async () => {
    if (!employee?.employeeCode) return;
    setLoading(true);
    const [prof, pay, cal, pol] = await Promise.all([
      api.getEmployeeProfile(employee.employeeCode).catch(() => null),
      api.getEmployeePayroll(employee.employeeCode, month).catch(() => null),
      api.getAttendanceCalendar(month, employee.employeeCode).catch(() => null),
      api.getPolicySettings().catch(() => null),
    ]);
    setProfile(prof);
    setPayroll(pay);
    setDays(cal?.days ?? []);
    setPolicy(pol);
    setLoading(false);
  }, [employee?.employeeCode, month]);

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen, load, dataVersion]);

  if (!isOpen || !employee) return null;

  const recorded = days.filter((d) => d.status && (d.firstIn || d.lastOut || d.manualOverride));
  const initials =
    (profile?.name || employee.employeeName).split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase() || 'EM';
  const hasSalary = !!payroll && payroll.monthlyCtc > 0;

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
        <div
          className="w-full sm:max-w-xl md:max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300 border-l border-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-sky-50/30">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#1184b0] to-[#011638] text-white flex items-center justify-center font-heading font-extrabold text-base shadow-md shadow-brand-500/20">
                  {initials}
                </div>
                <div>
                  <h2 className="font-heading font-extrabold text-lg text-slate-900">{profile?.name || employee.employeeName}</h2>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5">
                    <span className="font-bold text-brand-600">ID: {employee.employeeCode}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-slate-400" />{employee.siteName}</span>
                    {profile?.department && (<><span>•</span><span>{profile.department}</span></>)}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                <button type="button" onClick={() => setIsEditOpen(true)} className="p-2 rounded-xl text-slate-600 hover:text-brand-600 hover:bg-sky-50 transition border border-slate-200" title="Edit Profile & Salary">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <button type="button" onClick={() => setIsPayslipOpen(true)} className="flex-1 py-2 px-3 bg-[#011638] hover:bg-[#022359] text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition">
                <DollarSign className="w-3.5 h-3.5 text-sky-400" />
                <span>Monthly Payslip & Email</span>
              </button>
              <button type="button" onClick={() => setIsEditOpen(true)} className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5 transition">
                <Edit3 className="w-3.5 h-3.5 text-[#1184b0]" />
                <span>Salary / CTC</span>
              </button>
            </div>

            {/* KPI cards: every number is the payroll engine's */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payable</span>
                <span className="text-sm font-extrabold font-heading text-emerald-600 mt-0.5 block">{payroll ? `${payroll.payableDays}d` : 'N/A'}</span>
                <span className="text-[9px] text-slate-400 font-medium block">{payroll ? `of ${payroll.elapsedDays}d elapsed` : ''}</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">LOP</span>
                <span className="text-sm font-extrabold font-heading text-rose-600 mt-0.5 block">{payroll ? `${payroll.lopDays}d` : 'N/A'}</span>
                <span className="text-[9px] text-slate-400 font-medium block">Loss of Pay</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Work Hrs</span>
                <span className="text-sm font-extrabold font-heading text-indigo-600 mt-0.5 block">{payroll ? `${payroll.totalWorkHours}h` : 'N/A'}</span>
                <span className="text-[9px] text-slate-400 font-medium block">{payroll ? `${payroll.halfDays} half-day` : ''}</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">OT Hours</span>
                <span className="text-sm font-extrabold font-heading text-violet-600 mt-0.5 block">{payroll ? `${payroll.totalOtHours}h` : 'N/A'}</span>
                <span className="text-[9px] text-violet-600 font-semibold block">{payroll && payroll.otEarnings > 0 ? `+${inr(payroll.otEarnings)}` : ''}</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{payroll?.isProvisional === false ? 'Net Pay' : 'Net So Far'}</span>
                <span className="text-sm font-extrabold font-heading text-[#1184b0] mt-0.5 block">{hasSalary ? inr(payroll!.netPayable) : '—'}</span>
                <span className="text-[9px] text-emerald-600 font-semibold block">{payroll?.isProvisional ? 'Provisional' : payroll ? 'Final' : ''}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-4 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              {([
                ['overview', TrendingUp, 'Overview & Profile'],
                ['timeline', Clock, `Days (${recorded.length})`],
                ['calendar', CalendarCheck, 'Monthly Grid'],
              ] as const).map(([key, Icon, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === key ? 'bg-white text-brand-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
            {loading && <p className="text-xs text-slate-400">Loading…</p>}

            {activeTab === 'overview' && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 font-heading flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-[#1184b0]" /> Employee Profile Details</span>
                    <button type="button" onClick={() => setIsEditOpen(true)} className="text-[11px] font-bold text-brand-600 hover:underline">Edit Info</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      ['Date of Birth', profile?.dob],
                      ['Official Email', profile?.email],
                      ['Monthly CTC', profile?.monthlyCtc ? inr(profile.monthlyCtc) : undefined],
                      ['Bank A/C Number', profile?.bankAccount],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-white p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium">{label}</span>
                        <span className="font-bold text-slate-800 truncate block">{value || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {hasSalary ? (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50/50 border border-sky-200/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-950 font-heading flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-[#1184b0]" /> Monthly Payroll Summary</span>
                      <span className="text-[11px] font-bold text-sky-700">{payroll!.month} · {payroll!.isProvisional ? 'provisional' : `closed v${payroll!.snapshotVersion}`}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-sky-100"><span className="text-[10px] text-slate-400 block">Payable / Month Days</span><span className="font-extrabold text-slate-800">{payroll!.payableDays} / {payroll!.monthDays}</span></div>
                      <div className="bg-white p-2.5 rounded-xl border border-sky-100"><span className="text-[10px] text-slate-400 block">Present / Half / Leave</span><span className="font-extrabold text-emerald-600">{payroll!.presentDays} / {payroll!.halfDays} / {payroll!.leaveDays}</span></div>
                      <div className="bg-white p-2.5 rounded-xl border border-sky-100"><span className="text-[10px] text-slate-400 block">Overtime</span><span className="font-extrabold text-violet-600">{payroll!.totalOtHours}h {payroll!.otEarnings > 0 ? `(+${inr(payroll!.otEarnings)})` : ''}</span></div>
                      <div className="bg-white p-2.5 rounded-xl border border-sky-100"><span className="text-[10px] text-slate-400 block">Loss of Pay</span><span className="font-extrabold text-rose-600">-{inr(payroll!.lopDeduction)} ({payroll!.lopDays}d)</span></div>
                      <div className="bg-white p-2.5 rounded-xl border border-sky-100 sm:col-span-2"><span className="text-[10px] text-slate-400 block">Net Pay</span><span className="font-extrabold text-[#1184b0] text-sm">{inr(payroll!.netPayable)}</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1.5">
                    <DollarSign className="w-5 h-5 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">Salary Not Configured</p>
                    <p className="text-[11px] text-slate-400">No monthly CTC has been assigned to this employee yet.</p>
                  </div>
                )}

                {policy && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 font-heading">Shift & Grace Policy</span>
                      <span className="text-xs font-bold text-brand-600 bg-sky-100/70 px-2 py-0.5 rounded-md">{policy.shift.shiftName}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100"><span className="text-[10px] text-slate-400 block font-bold">Standard Timing</span><span className="font-extrabold text-slate-800">{policy.shift.startTime} – {policy.shift.endTime}</span></div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100"><span className="text-[10px] text-slate-400 block font-bold">Grace Period</span><span className="font-extrabold text-slate-800">{policy.shift.gracePeriodMinutes} minutes</span></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="space-y-3">
                {days.filter((d) => d.status !== null).length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-medium">No attendance days to show yet this month.</div>
                ) : (
                  [...days].filter((d) => d.status !== null).reverse().map((d) => {
                    const meta = metaFor(d.status);
                    return (
                      <div
                        key={d.businessDate}
                        onClick={() => setSelectedDay(d)}
                        className="p-3.5 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between shadow-xs cursor-pointer hover:bg-sky-50/40 hover:border-sky-300 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-8 rounded-xl border flex items-center justify-center font-bold text-xs ${meta.cell}`}>{meta.short}</div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-extrabold text-slate-900 font-heading group-hover:text-brand-600 transition-colors">{formatBusinessDay(d.businessDate)}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${meta.badge}`}>{d.inProgress ? 'Checked in' : d.statusLabel}</span>
                              {d.isLate && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">Late +{formatMinutes(d.lateMinutes)}</span>}
                              {d.overtimeMinutes > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">OT {formatMinutes(d.overtimeMinutes)}</span>}
                              {d.manualOverride && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">Approved request</span>}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">In {d.firstIn || '--:--'} · Out {d.lastOut || '--:--'}{d.workMinutes ? ` · ${formatMinutes(d.workMinutes)}h` : ''}</div>
                          </div>
                        </div>
                        <span className="text-[11px] text-brand-600 font-bold group-hover:underline">Edit / WFH</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'calendar' && (
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <AttendanceCalendar days={days} />
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">Attendance and payroll figures are computed by the server</span>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all">Close Drawer</button>
          </div>
        </div>
      </div>

      <EditEmployeeModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        empCode={employee.employeeCode}
        onSaved={(updated) => { setProfile(updated); void load(); }}
      />
      <PayslipModal isOpen={isPayslipOpen} onClose={() => setIsPayslipOpen(false)} empCode={employee.employeeCode} />
      <DayAdjustmentModal isOpen={Boolean(selectedDay)} onClose={() => setSelectedDay(null)} day={selectedDay} onSaved={() => void load()} />
    </>
  );
};
