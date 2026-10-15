import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon, Clock, Download, FileText, Plus, Search, Send, Building2, DollarSign, CheckCircle2, CalendarCheck2, AlertCircle, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useDataVersion } from '../services/dataSync';
import { errorMessage } from '../lib/apiError';
import { formatBusinessDate, formatBusinessDay, istMonth, istToday, monthLabel } from '../lib/businessDate';
import { formatMinutes, metaFor } from '../lib/attendanceDisplay';
import { inr } from '../lib/utils';
import { EmployeePunchCard } from '../components/attendance/EmployeePunchCard';
import { AttendanceCalendar } from '../components/attendance/AttendanceCalendar';
import { DayAdjustmentModal } from '../components/attendance/DayAdjustmentModal';
import { PayslipModal } from '../components/payroll/PayslipModal';
import type {
  AttendanceDay, AttendanceRegularizationRequest, EmployeePayrollSummary, EmployeeProfile, LeaveBalance, LeaveType, RequestType,
} from '../types';

const LEAVE_LABELS: Record<LeaveType, string> = {
  CASUAL_LEAVE: 'Casual Leave (CL)', SICK_LEAVE: 'Sick Leave (SL)', EARNED_LEAVE: 'Earned Leave (EL)', COMP_OFF: 'Comp Off', UNPAID_LEAVE: 'Unpaid Leave (LWP)',
};
const REQUEST_LABELS: Record<RequestType, string> = {
  LEAVE: 'Leave', MISSED_PUNCH: 'Missed Swipe Regularization', WORK_FROM_HOME: 'Work From Home', ON_DUTY: 'On Duty',
};
const STATUS_STYLE: Record<AttendanceRegularizationRequest['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  APPROVED: 'bg-sky-100 text-sky-800 border-sky-200',
  APPLIED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-rose-100 text-rose-800 border-rose-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
  REVOKED: 'bg-slate-100 text-slate-600 border-slate-200',
};
const STATUS_TEXT: Record<AttendanceRegularizationRequest['status'], string> = {
  PENDING: 'Awaiting approval', APPROVED: 'Approved', APPLIED: 'Approved', REJECTED: 'Rejected', CANCELLED: 'Cancelled', REVOKED: 'Revoked',
};

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none';

export const MyPortal: React.FC = () => {
  const { user, isSuperAdmin, isEmployee } = useAuth();
  const month = istMonth();
  const today = istToday();

  const [allEmployees, setAllEmployees] = useState<EmployeeProfile[]>([]);
  const [selectedEmpCode, setSelectedEmpCode] = useState<string>(() => (isEmployee && user?.empCode ? user.empCode : ''));
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [payroll, setPayroll] = useState<EmployeePayrollSummary | null>(null);
  const [days, setDays] = useState<AttendanceDay[]>([]);
  const [requests, setRequests] = useState<AttendanceRegularizationRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'attendance' | 'requests' | 'salary'>('attendance');
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [dayModal, setDayModal] = useState<AttendanceDay | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Request modals
  const [modal, setModal] = useState<null | 'leave' | 'other'>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ requestType: 'LEAVE' as RequestType, leaveType: 'CASUAL_LEAVE' as LeaveType, date: '', endDate: '', halfDay: false, inTime: '', outTime: '', reason: '' });

  useEffect(() => {
    if (isEmployee && user?.empCode) setSelectedEmpCode(user.empCode);
  }, [isEmployee, user?.empCode]);

  // Admins pick an employee from the roster the server returns (no hard-coded default employee).
  useEffect(() => {
    if (isEmployee) return;
    api.getAllEmployees().then((emps) => {
      setAllEmployees(emps);
      setSelectedEmpCode((cur) => cur || emps[0]?.empCode || '');
    }).catch((e) => setLoadError(errorMessage(e)));
  }, [isEmployee]);

  const load = useCallback(async (empCode: string) => {
    if (!empCode) { setIsLoading(false); return; }
    setIsLoading(true);
    setLoadError(null);
    const settle = async <T,>(p: Promise<T>): Promise<T | null> => p.catch((e) => { setLoadError(errorMessage(e)); return null; });
    const [prof, pay, cal, reqs, bal] = await Promise.all([
      settle(api.getEmployeeProfile(empCode)),
      settle(api.getEmployeePayroll(empCode, month)),
      settle(api.getAttendanceCalendar(month, empCode)),
      settle(api.getRequests({ empCode })),
      settle(api.getLeaveBalance(empCode)),
    ]);
    setProfile(prof);
    setPayroll(pay);
    setDays(cal?.days ?? []);
    setRequests(reqs ?? []);
    setBalance(bal);
    setIsLoading(false);
  }, [month]);

  const dataVersion = useDataVersion();
  useEffect(() => { void load(selectedEmpCode); }, [selectedEmpCode, dataVersion, load]);

  const openModal = (kind: 'leave' | 'other') => {
    setModalError(null);
    setForm((f) => ({ ...f, requestType: kind === 'leave' ? 'LEAVE' : 'MISSED_PUNCH', date: '', endDate: '', halfDay: false, reason: '' }));
    setModal(kind);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      await api.createRequest({
        empCode: selectedEmpCode,
        requestType: form.requestType,
        date: form.date,
        endDate: form.endDate && form.endDate !== form.date ? form.endDate : undefined,
        halfDay: form.requestType === 'LEAVE' && form.halfDay ? true : undefined,
        leaveType: form.requestType === 'LEAVE' ? form.leaveType : undefined,
        inTime: form.requestType === 'MISSED_PUNCH' ? form.inTime : undefined,
        outTime: form.requestType === 'MISSED_PUNCH' ? form.outTime : undefined,
        reason: form.reason.trim(),
      });
      setModal(null);
      setNotice({ type: 'success', text: 'Request submitted. It is pending approval; your attendance and leave balance change only after it is approved.' });
      setTimeout(() => setNotice(null), 6000);
      await load(selectedEmpCode);
    } catch (err) {
      setModalError(errorMessage(err, 'Could not submit the request.'));
    } finally {
      setSubmitting(false);
    }
  };

  const cancelRequest = async (id: string) => {
    try {
      await api.cancelRequest(id);
      await load(selectedEmpCode);
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err, 'Could not cancel the request.') });
    }
  };

  const filteredEmployees = allEmployees.filter((emp) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q || emp.name.toLowerCase().includes(q) || emp.empCode.toLowerCase().includes(q) || (emp.department ?? '').toLowerCase().includes(q);
    return matchesSearch && (departmentFilter === 'ALL' || emp.department === departmentFilter);
  });
  const departments = Array.from(new Set(allEmployees.map((e) => e.department).filter(Boolean))) as string[];

  const todayDay = days.find((d) => d.businessDate === today);
  const initials = (profile?.name || 'User').split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase() || 'EM';
  const recorded = days.filter((d) => d.status !== null && (d.firstIn || d.lastOut || d.manualOverride || d.status === 'HOLIDAY' || d.status === 'WEEKLY_OFF' || d.status === 'ABSENT')).reverse();
  const hasSalary = !!payroll && payroll.monthlyCtc > 0;

  if (!selectedEmpCode && !isLoading && !isEmployee) {
    return <div className="p-8 text-center text-sm text-slate-500">{loadError ?? 'No employees found yet. Sync biometric data or add an employee first.'}</div>;
  }

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300 w-full">
      {!isEmployee ? (
        <div className="bg-gradient-to-r from-[#011638] via-[#093554] to-[#1184b0] rounded-3xl p-6 sm:p-7 text-white shadow-xl shadow-[#011638]/20 relative overflow-hidden">
          <div className="relative z-10 flex flex-col gap-5">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-400/20 text-sky-200 border border-sky-400/30">
                {isSuperAdmin ? 'Super Admin Mode' : 'Founder Mode'}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-heading mt-2">Staff 360° Inspector: {profile?.name ?? selectedEmpCode}</h1>
              <p className="text-xs text-sky-100/80 font-medium mt-0.5">Attendance, leave balance, overtime and salary breakdown for any staff member.</p>
            </div>
            <div className="bg-white/95 rounded-2xl p-3 border border-white/20 shadow-lg flex flex-col md:flex-row items-center gap-2.5 text-slate-800">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text" placeholder="Search staff name, code or department..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none font-medium"
                />
              </div>
              {departments.length > 0 && (
                <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2.5 w-full md:w-auto">
                  <option value="ALL">All Departments</option>
                  {departments.map((d) => (<option key={d} value={d}>{d}</option>))}
                </select>
              )}
              <select value={selectedEmpCode} onChange={(e) => setSelectedEmpCode(e.target.value)} className="bg-gradient-to-r from-[#011638] to-[#1184b0] text-white font-bold text-xs rounded-xl px-3.5 py-2.5 w-full md:w-auto">
                {filteredEmployees.map((emp) => (<option key={emp.empCode} value={emp.empCode} className="bg-slate-900 text-white">#{emp.empCode}: {emp.name}{emp.department ? ` (${emp.department})` : ''}</option>))}
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1184b0] to-[#011638] text-white flex items-center justify-center font-heading font-extrabold text-xl">{initials}</div>
            <div>
              <h1 className="text-lg font-heading font-extrabold text-slate-900">Welcome, {profile?.name ?? user?.name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium mt-1">
                <span className="font-mono font-bold text-[#1184b0]">Emp ID: {selectedEmpCode}</span>
                {profile?.department && (<><span>•</span><span>{profile.department}</span></>)}
                {profile?.designation && (<><span>•</span><span>{profile.designation}</span></>)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button onClick={() => openModal('leave')} className="px-3.5 py-2 bg-gradient-to-r from-[#1184b0] to-[#011638] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Apply Leave</button>
            <button onClick={() => openModal('other')} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[#1184b0]" /> Regularize / WFH / OD</button>
          </div>
        </div>
      )}

      {notice && (
        <div className={`p-3.5 border rounded-xl text-xs font-semibold flex items-center gap-2 ${notice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}
      {loadError && !isLoading && <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">{loadError}</div>}

      {isEmployee ? (
        <EmployeePunchCard empCode={selectedEmpCode} empName={profile?.name} onPunchSuccess={() => void load(selectedEmpCode)} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#1184b0] shrink-0"><Clock className="w-5 h-5" /></div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">Today ({formatBusinessDate(today)})</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${metaFor(todayDay?.status).badge}`}>{todayDay?.inProgress ? 'Checked in' : todayDay?.statusLabel || '—'}</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                IN: <strong className="text-slate-800 font-mono">{todayDay?.firstIn ?? '--:--'}</strong> • OUT: <strong className="text-slate-800 font-mono">{todayDay?.lastOut ?? '--:--'}</strong> • Worked: <strong className="text-slate-800">{formatMinutes(todayDay?.workMinutes)} hrs</strong>
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shrink-0">
            <Building2 className="w-3.5 h-3.5 text-[#1184b0]" /><span>Unit: <strong className="text-slate-800">{todayDay?.siteName ?? profile?.location ?? '—'}</strong></span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payable Days</span>
          <div className="flex items-baseline gap-1 mt-1"><span className="text-2xl font-heading font-extrabold text-emerald-600">{payroll ? `${payroll.payableDays}d` : '—'}</span><span className="text-xs text-slate-400 font-medium">{payroll ? `/ ${payroll.elapsedDays}d elapsed` : ''}</span></div>
          <span className="text-[10px] text-slate-500 block mt-0.5">{monthLabel(month)}</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Holidays / Paid Leave</span>
          <span className="text-2xl font-heading font-extrabold text-purple-700 mt-1 block">{payroll ? `${payroll.holidays} / ${payroll.leaveDays}` : '—'}</span>
          <span className="text-[10px] text-purple-700 font-semibold block mt-0.5">Paid, no loss of pay</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Loss of Pay (LOP)</span>
          <span className="text-2xl font-heading font-extrabold text-rose-600 mt-1 block">{payroll ? `${payroll.lopDays}d` : '—'}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">{payroll ? `${payroll.halfDays} half-day, ${payroll.missedPunchDays} missed punch` : ''}</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overtime (OT)</span>
          <span className="text-2xl font-heading font-extrabold text-violet-600 mt-1 block">{payroll ? `${payroll.totalOtHours}h` : '—'}</span>
          <span className="text-[10px] text-violet-600 font-semibold block mt-0.5">{payroll && payroll.otEarnings > 0 ? `+${inr(payroll.otEarnings)} earned` : '0 OT pay'}</span>
        </div>
        <div className="p-4 bg-gradient-to-br from-[#011638] to-[#1184b0] text-white rounded-2xl shadow-md flex flex-col justify-between col-span-2 sm:col-span-1">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-200 block">{payroll?.isProvisional === false ? 'Net Pay' : 'Net Pay So Far'}</span>
            <span className="text-2xl font-heading font-extrabold mt-1 block">{hasSalary ? inr(payroll!.netPayable) : '—'}</span>
            {payroll?.isProvisional && <span className="text-[10px] text-sky-200">Provisional until payroll closes</span>}
          </div>
          <button type="button" onClick={() => setIsPayslipOpen(true)} className="mt-2 py-1.5 px-3 bg-white/15 hover:bg-white/25 text-white rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition"><Download className="w-3.5 h-3.5" /><span>View Payslip</span></button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1 rounded-2xl text-xs font-semibold">
        {([['attendance', CalendarCheck2, `My Attendance (${recorded.length})`], ['requests', Send, `Requests (${requests.length})`], ['salary', DollarSign, 'Salary Breakup (Annexure K)']] as const).map(([key, Icon, label]) => (
          <button key={key} type="button" onClick={() => setActiveTab(key)} className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${activeTab === key ? 'bg-white text-[#1184b0] shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}>
            <Icon className="w-4 h-4" /><span>{label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card space-y-4">
            <span className="font-heading font-bold text-slate-900 text-sm flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-[#1184b0]" />{monthLabel(month)}</span>
            <AttendanceCalendar days={days} />
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card space-y-4">
            <h2 className="text-sm font-heading font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3"><Clock className="w-4 h-4 text-[#1184b0]" /> Day-by-day record</h2>
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {recorded.length === 0 && <p className="text-xs text-slate-400 text-center py-8">No attendance recorded this month yet.</p>}
              {recorded.map((d) => {
                const meta = metaFor(d.status);
                return (
                  <div
                    key={d.businessDate}
                    onClick={() => setDayModal(d)}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between shadow-xs cursor-pointer hover:bg-sky-50/40 hover:border-sky-300 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-9 rounded-xl border flex items-center justify-center font-bold text-xs ${meta.cell}`}>{d.inProgress ? 'IN' : meta.short}</div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-extrabold text-slate-900 font-heading group-hover:text-brand-600 transition-colors">{formatBusinessDay(d.businessDate)}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${meta.badge}`}>{d.inProgress ? 'Checked in' : d.statusLabel}</span>
                          {d.isLate && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">Late +{formatMinutes(d.lateMinutes)}</span>}
                          {d.manualOverride && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">Approved request</span>}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">In: <strong className="text-slate-800">{d.firstIn ?? '--:--'}</strong> • Out: <strong className="text-slate-800">{d.lastOut ?? '--:--'}</strong></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-slate-900 font-heading block">{formatMinutes(d.workMinutes)}</span>
                      <span className="text-[10px] text-brand-600 font-semibold group-hover:underline">Click to edit/WFH</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            {balance && (Object.entries(balance.balances) as [keyof LeaveBalance['balances'], LeaveBalance['balances'][keyof LeaveBalance['balances']]][]).map(([type, b]) => (
              <div key={type} className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{LEAVE_LABELS[type]}</span>
                <span className="text-2xl font-heading font-extrabold text-sky-600 mt-1 block">{b.available} <span className="text-xs text-slate-400 font-medium">of {b.quota}</span></span>
                <span className="text-[10px] text-slate-500">{b.used} used{b.pending ? `, ${b.pending} pending` : ''} in {balance.year}</span>
              </div>
            ))}
            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quick Actions</span>
              <div className="flex items-center gap-2 mt-2">
                <button type="button" onClick={() => openModal('leave')} className="flex-1 py-1.5 px-2.5 bg-[#1184b0] hover:bg-[#0d6c92] text-white rounded-xl text-[11px] font-semibold">Apply Leave</button>
                <button type="button" onClick={() => openModal('other')} className="flex-1 py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-semibold">Other</button>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-heading font-bold text-slate-900">Submitted Applications & Status</h2>
              <span className="text-xs font-bold text-slate-500">{requests.length} requests</span>
            </div>
            {requests.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200"><Send className="w-8 h-8 text-slate-300 mx-auto mb-1.5" /><p className="font-bold text-slate-700">No applications submitted</p></div>
            ) : (
              <div className="space-y-2.5">
                {requests.map((req) => (
                  <div key={req.id} className="p-3.5 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between gap-3 shadow-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 font-heading">{req.requestType === 'LEAVE' && req.leaveType ? LEAVE_LABELS[req.leaveType] : REQUEST_LABELS[req.requestType]}{req.halfDay ? ' (half day)' : ''}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[req.status]}`}>{STATUS_TEXT[req.status]}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        <strong className="text-slate-700">{formatBusinessDate(req.date)}{req.endDate ? ` to ${formatBusinessDate(req.endDate)}` : ''}</strong>{req.days !== undefined ? ` (${req.days} day${req.days === 1 ? '' : 's'})` : ''} • {req.reason}
                      </p>
                      {req.reviewedBy && <p className="text-[10px] text-slate-400 mt-1">Reviewed by <strong className="text-slate-600">{req.reviewedBy}</strong>{req.reviewComment ? `: ${req.reviewComment}` : ''}</p>}
                    </div>
                    {req.status === 'PENDING' && (
                      <button type="button" onClick={() => void cancelRequest(req.id)} className="shrink-0 py-1.5 px-3 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancel</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'salary' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2"><span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-[#1184b0] text-white rounded">Official Document</span><h2 className="text-base font-heading font-extrabold text-slate-900">Annexure K: Breakup of CTC</h2></div>
              <p className="text-xs text-slate-500 mt-0.5">Compensation and statutory cost breakdown</p>
            </div>
            <button type="button" onClick={() => setIsPayslipOpen(true)} className="px-4 py-2 bg-[#011638] hover:bg-[#02245b] text-white rounded-xl text-xs font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-sky-400" /><span>Monthly Payslip</span></button>
          </div>
          {hasSalary && payroll && profile ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                {[['Employee Name', profile.name], ['Department', profile.department], ['Designation', profile.designation], ['Date of Joining', profile.doj ? formatBusinessDate(profile.doj) : undefined]].map(([label, value]) => (
                  <div key={label}><span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">{label}</span><span className="font-bold text-slate-900">{value || '—'}</span></div>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead><tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-extrabold"><th className="py-3 px-4">PARTICULARS</th><th className="py-3 px-4 text-right w-44">Per Annum (₹)</th><th className="py-3 px-4 text-right w-44">Per Month (₹)</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {([
                      ['Basic (A)', payroll.basicSalary, 'font-semibold'],
                      ['Dearness Allowance', payroll.da, 'font-semibold'],
                      ['HRA (C1)', payroll.hra, 'font-semibold'],
                      ['Special Allowance (C2)', payroll.allowances, 'font-semibold'],
                      ['Other Allowance', payroll.otherAllowance, 'font-semibold'],
                      ['Gross Salary (D)', payroll.grossSalary, 'bg-slate-100 font-extrabold'],
                      ['Employee PF (E)', payroll.pfDeduction, 'text-rose-700'],
                      ['Employee ESIC (F)', payroll.esiDeduction, 'text-slate-600'],
                      ['Total Net Salary (G)', payroll.totalNetSalary, 'bg-sky-50/80 font-extrabold text-sky-950'],
                      ['Employer PF (H)', payroll.employerPf, 'text-indigo-700'],
                      ['Employer ESIC (I)', payroll.employerEsic, 'text-slate-600'],
                      ['Professional Tax (J)', payroll.ptDeduction, 'text-slate-700'],
                      ['Total Gross CTC (L)', payroll.monthlyCtc, 'bg-slate-900 text-white font-extrabold'],
                    ] as const).filter(([label, amount]) => amount > 0 || label.startsWith('Gross Salary') || label.startsWith('Total')).map(([label, amount, style]) => (
                      <tr key={label} className={style}><td className="py-2.5 px-4">{label}</td><td className="py-2.5 px-4 text-right font-mono">{inr(amount * 12)}</td><td className="py-2.5 px-4 text-right font-mono font-bold">{inr(amount)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">{payroll.isProvisional ? 'Net pay so far this month' : 'Net pay for the month'}</span>
                  <p className="text-xs text-emerald-700">{payroll.elapsedDays}/{payroll.monthDays} days accrued • {payroll.lopDays} LOP day(s) • see the payslip for the full line-by-line breakdown.</p>
                </div>
                <span className="text-2xl font-heading font-extrabold text-emerald-800 font-mono">{inr(payroll.netPayable)}</span>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center"><p className="text-xs font-semibold text-slate-600">Salary not configured yet</p><p className="text-[11px] text-slate-400 mt-1">HR has not set up a CTC breakdown for this employee. Contact HR.</p></div>
          )}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-heading font-bold text-slate-900">{modal === 'leave' ? 'Apply for Leave' : 'Regularize, Work From Home or On Duty'}</h2>
              <button type="button" onClick={() => setModal(null)} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
            </div>
            {modalError && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">{modalError}</div>}
            <form onSubmit={submit} className="space-y-3.5 text-xs">
              {modal === 'other' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Request type</label>
                  <select value={form.requestType} onChange={(e) => setForm((f) => ({ ...f, requestType: e.target.value as RequestType }))} className={inputCls}>
                    <option value="MISSED_PUNCH">Missed punch regularization</option>
                    <option value="WORK_FROM_HOME">Work from home</option>
                    <option value="ON_DUTY">On duty</option>
                  </select>
                </div>
              )}
              {modal === 'leave' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Leave type</label>
                  <select value={form.leaveType} onChange={(e) => setForm((f) => ({ ...f, leaveType: e.target.value as LeaveType }))} className={inputCls}>
                    {(Object.keys(LEAVE_LABELS) as LeaveType[]).map((t) => (<option key={t} value={t}>{LEAVE_LABELS[t]}</option>))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div><label className="font-semibold text-slate-700 block mb-1">{form.requestType === 'MISSED_PUNCH' ? 'Date of missed punch' : 'From date'}</label><input type="date" required value={form.date} max={form.requestType === 'MISSED_PUNCH' ? today : undefined} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} /></div>
                {form.requestType !== 'MISSED_PUNCH' && (<div><label className="font-semibold text-slate-700 block mb-1">To date (optional)</label><input type="date" value={form.endDate} min={form.date || undefined} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className={inputCls} /></div>)}
              </div>
              {form.requestType === 'LEAVE' && (
                <label className="flex items-center gap-2 font-medium text-slate-700"><input type="checkbox" checked={form.halfDay} disabled={!!form.endDate && form.endDate !== form.date} onChange={(e) => setForm((f) => ({ ...f, halfDay: e.target.checked }))} /> Half day (single date only)</label>
              )}
              {form.requestType === 'MISSED_PUNCH' && (
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="font-semibold text-slate-700 block mb-1">In time</label><input type="time" required value={form.inTime} onChange={(e) => setForm((f) => ({ ...f, inTime: e.target.value }))} className={inputCls} /></div>
                  <div><label className="font-semibold text-slate-700 block mb-1">Out time</label><input type="time" required value={form.outTime} onChange={(e) => setForm((f) => ({ ...f, outTime: e.target.value }))} className={inputCls} /></div>
                </div>
              )}
              <div><label className="font-semibold text-slate-700 block mb-1">Reason</label><textarea required rows={3} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none" /></div>
              <p className="text-[11px] text-slate-500">Weekly offs and company holidays in the range are not counted. Your request is reviewed by an administrator before it affects attendance or leave balance.</p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#1184b0] hover:bg-[#0d6c92] text-white font-bold rounded-xl shadow-xs disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPayslipOpen && <PayslipModal isOpen onClose={() => setIsPayslipOpen(false)} empCode={selectedEmpCode} />}
      <DayAdjustmentModal isOpen={Boolean(dayModal)} onClose={() => setDayModal(null)} day={dayModal} />
    </div>
  );
};
