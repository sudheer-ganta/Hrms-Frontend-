import React, { useState, useEffect } from 'react';
import { 
  User, 
  Calendar, 
  Clock, 
  DollarSign, 
  FileText, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  CalendarCheck2, 
  Plus, 
  Building2, 
  Mail, 
  Phone, 
  CreditCard,
  Sparkles,
  ShieldCheck,
  PartyPopper,
  Search,
  Check,
  Download
} from 'lucide-react';
import { api } from '../services/api';
import { 
  EmployeeProfile, 
  EmployeePayrollSummary, 
  InOutRecord, 
  CompanyHoliday, 
  AttendanceRegularizationRequest, 
  LeaveBalance 
} from '../types';
import { PayslipModal } from '../components/payroll/PayslipModal';
import { getCurrentMonthCalendarInfo } from '../lib/utils';

export const MyPortal: React.FC = () => {
  const [allEmployees, setAllEmployees] = useState<EmployeeProfile[]>([]);
  const [selectedEmpCode, setSelectedEmpCode] = useState<string>(() => {
    return localStorage.getItem('colormyles_ess_emp') || '0132';
  });

  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [payrollSummary, setPayrollSummary] = useState<EmployeePayrollSummary | null>(null);
  const [swipes, setSwipes] = useState<InOutRecord[]>([]);
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [requests, setRequests] = useState<AttendanceRegularizationRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);

  const [activeTab, setActiveTab] = useState<'attendance' | 'requests' | 'salary'>('attendance');
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Request Modals
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isRegularizeModalOpen, setIsRegularizeModalOpen] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  // Form states
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveType, setLeaveType] = useState<'CASUAL_LEAVE' | 'SICK_LEAVE' | 'EARNED_LEAVE'>('CASUAL_LEAVE');
  const [leaveReason, setLeaveReason] = useState('');

  const [regDate, setRegDate] = useState('');
  const [regInTime, setRegInTime] = useState('09:00');
  const [regOutTime, setRegOutTime] = useState('18:00');
  const [regReason, setRegReason] = useState('');

  const loadAllData = async (empCode: string) => {
    setIsLoading(true);
    try {
      const [emps, prof, ps, swRes, pol, reqs, bal] = await Promise.all([
        api.getAllEmployees().catch(() => [] as EmployeeProfile[]),
        api.getEmployeeProfile(empCode).catch(() => null),
        api.getEmployeePayroll(empCode).catch(() => null),
        api.getInOutAttendance({ employeeCode: empCode, limit: 100 }).catch(() => ({ data: [] as InOutRecord[] })),
        api.getPolicySettings().catch(() => null),
        api.getRequests({ empCode }).catch(() => [] as AttendanceRegularizationRequest[]),
        api.getLeaveBalance(empCode).catch(() => null),
      ]);

      setAllEmployees(emps);
      setProfile(prof || (emps.find(e => e.empCode === empCode) || null));
      setPayrollSummary(ps);
      setSwipes(swRes.data || []);
      setHolidays(pol?.holidays || []);
      setRequests(reqs);
      setLeaveBalance(bal);
    } catch (err) {
      console.error('Error loading ESS portal data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('colormyles_ess_emp', selectedEmpCode);
    loadAllData(selectedEmpCode);
  }, [selectedEmpCode]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveDate || !leaveReason.trim()) return;

    try {
      await api.createRequest({
        empCode: selectedEmpCode,
        empName: profile?.name || 'Employee',
        requestType: 'LEAVE',
        date: leaveDate,
        leaveType,
        reason: leaveReason.trim(),
      });
      setIsLeaveModalOpen(false);
      setLeaveDate('');
      setLeaveReason('');
      setRequestSuccess('Leave application submitted & approved successfully!');
      setTimeout(() => setRequestSuccess(null), 4000);
      loadAllData(selectedEmpCode);
    } catch (err) {
      console.error('Failed to submit leave:', err);
    }
  };

  const handleRegularizePunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regDate || !regReason.trim()) return;

    try {
      await api.createRequest({
        empCode: selectedEmpCode,
        empName: profile?.name || 'Employee',
        requestType: 'MISSED_PUNCH',
        date: regDate,
        inTime: regInTime,
        outTime: regOutTime,
        reason: regReason.trim(),
      });
      setIsRegularizeModalOpen(false);
      setRegDate('');
      setRegReason('');
      setRequestSuccess('Punch regularization submitted & credited to attendance!');
      setTimeout(() => setRequestSuccess(null), 4000);
      loadAllData(selectedEmpCode);
    } catch (err) {
      console.error('Failed to submit regularization:', err);
    }
  };

  const initials = (profile?.name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'EM';

  // Calendar matrix is always "this month" — computed from the real date rather
  // than a fixed month, so the portal doesn't go stale once the month changes.
  const { daysInMonth: daysInCalendarMonth, monthLabel: calendarMonthLabel, monthName: calendarMonthName, todayISO, leadingPadding, buildDateStr } =
    getCurrentMonthCalendarInfo();

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-6xl mx-auto">
      {/* Top Banner & Quick Employee Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1184b0] to-[#011638] text-white flex items-center justify-center font-heading font-extrabold text-xl shadow-md shadow-brand-500/20">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-heading font-extrabold text-slate-900">
                Welcome, {profile?.name || 'Employee'} 👋
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                {profile?.department || 'Operations'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium mt-1">
              <span className="font-mono font-bold text-[#1184b0]">Emp ID: {selectedEmpCode}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {profile?.location || 'Office'}
              </span>
              <span>•</span>
              <span>{profile?.designation || 'Staff'}</span>
            </div>
          </div>
        </div>

        {/* Quick Employee Selector for Demo/Multi-User view */}
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Logged In As</span>
            <span className="text-xs font-bold text-slate-700">{profile?.name}</span>
          </div>

          <select
            value={selectedEmpCode}
            onChange={(e) => setSelectedEmpCode(e.target.value)}
            className="bg-slate-50 border border-slate-200 focus:border-[#1184b0] focus:bg-white text-xs font-semibold text-slate-800 rounded-xl px-3 py-2 focus:outline-none transition shadow-xs"
          >
            {allEmployees.map((emp) => (
              <option key={emp.empCode} value={emp.empCode}>
                {emp.empCode} — {emp.name} ({emp.location || 'Office'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Success Notification Alert */}
      {requestSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{requestSuccess}</span>
        </div>
      )}

      {/* Key Metric Highlights (Month-to-Date) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payable Days (MTD)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-heading font-extrabold text-emerald-600">
              {payrollSummary?.payableDays ?? 0}d
            </span>
            <span className="text-xs text-slate-400 font-medium">/ {payrollSummary?.monthDays ?? 0}d</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Elapsed days in {calendarMonthName}</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Paid Corporate Holidays</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-heading font-extrabold text-purple-700">
              {payrollSummary?.holidays ?? 0} Day
            </span>
          </div>
          <span className="text-[10px] text-purple-700 font-semibold block mt-0.5">100% Paid • 0 LOP</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Loss of Pay (LOP)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-heading font-extrabold text-rose-600">
              {payrollSummary?.lopDays ?? 0}d
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Missed/Unrecorded punches</span>
        </div>

        <div className="p-4 bg-gradient-to-br from-[#011638] to-[#1184b0] text-white rounded-2xl shadow-md p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-200 block">Est. Take-Home Pay</span>
            <span className="text-2xl font-heading font-extrabold mt-1 block">
              {payrollSummary && payrollSummary.monthlyCtc > 0 && payrollSummary.netPayable > 0
                ? `₹${payrollSummary.netPayable.toLocaleString('en-IN')}`
                : '—'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsPayslipOpen(true)}
            className="mt-2 py-1.5 px-3 bg-white/15 hover:bg-white/25 text-white rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition backdrop-blur-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Payslip PDF</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
            activeTab === 'attendance'
              ? 'bg-white text-[#1184b0] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarCheck2 className="w-4 h-4" />
          <span>My Attendance & Punch Log ({swipes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-white text-[#1184b0] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Leave & Missed Swipe Requests ({requests.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('salary')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
            activeTab === 'salary'
              ? 'bg-white text-[#1184b0] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Salary Breakup (Annexure K)</span>
        </button>
      </div>

      {/* TAB 1: ATTENDANCE & PUNCHES */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Monthly Attendance Grid */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span className="font-heading font-bold text-slate-900 text-sm">{calendarMonthLabel} Monthly Calendar Matrix</span>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> Holiday</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Absent</span>
                <span className="flex items-center gap-1.5" title="Only check-in or check-out was recorded, not both"><span className="w-2.5 h-2.5 rounded-full bg-orange-400" /> Forgot Swipe</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Weekly Off</span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="text-center text-[11px] font-extrabold text-slate-400 uppercase py-1">
                  {day}
                </div>
              ))}

              {/* Leading offset padding so day 1 lands on its correct weekday column */}
              {Array.from({ length: leadingPadding }, (_, i) => (
                <div key={`pad-${i}`} className="h-13 rounded-xl bg-slate-50/40 border border-transparent" />
              ))}

              {Array.from({ length: daysInCalendarMonth }, (_, i) => {
                const dayNum = i + 1;
                const dateStr = buildDateStr(dayNum);
                const record = swipes.find(r => r.date === dateStr);
                const isSunday = new Date(dateStr + 'T00:00:00').getDay() === 0;
                const isFuture = dateStr > todayISO;
                const holidayMatch = holidays.find(h => h.date === dateStr);
                const isHoliday = Boolean(holidayMatch);

                const isPresent = !isSunday && !isHoliday && (record?.status === 'P' || (record && record.inTime && record.inTime !== '--:--' && record.status !== 'A'));
                const isHalf = !isSunday && !isHoliday && (record?.status === 'P/2');
                const hasIn = Boolean(record?.inTime && record.inTime !== '--:--');
                const hasOut = Boolean(record?.outTime && record.outTime !== '--:--');
                // Marked absent but exactly one punch exists — they were here, a swipe
                // just got missed. Worth showing differently from a genuine no-show.
                const isForgotSwipe = !isSunday && !isHoliday && record?.status === 'A' && hasIn !== hasOut;
                const isAbsent = !isSunday && !isHoliday && !isFuture && (!record || record.status === 'A') && !isForgotSwipe;

                let bgClass = 'bg-slate-50 border-slate-200 text-slate-500';
                let label = '—';

                if (isHoliday) {
                  bgClass = 'bg-purple-600 border-purple-700 text-white font-bold shadow-xs';
                  label = 'HL';
                } else if (isSunday) {
                  bgClass = 'bg-slate-100/80 border-slate-200 text-slate-500 font-semibold';
                  label = 'WO';
                } else if (isPresent) {
                  bgClass = 'bg-emerald-500 border-emerald-600 text-white font-bold shadow-xs';
                  label = 'P';
                } else if (isHalf) {
                  bgClass = 'bg-amber-400 border-amber-500 text-slate-950 font-bold shadow-xs';
                  label = 'P/2';
                } else if (isForgotSwipe) {
                  bgClass = 'bg-orange-400 border-orange-500 text-slate-950 font-bold shadow-xs';
                  label = 'FS';
                } else if (isAbsent) {
                  bgClass = 'bg-rose-500 border-rose-600 text-white font-bold shadow-xs';
                  label = 'A';
                }

                return (
                  <div
                    key={dayNum}
                    className={`h-13 rounded-xl border flex flex-col items-center justify-center p-1 text-xs transition-all ${bgClass}`}
                    title={isHoliday ? `${dateStr}: ${holidayMatch?.name}` : record ? `${dateStr}: In ${record.inTime || '--'}, Out ${record.outTime || '--'}` : dateStr}
                  >
                    <span className="font-extrabold text-[13px]">{dayNum}</span>
                    <span className="text-[9px] font-bold opacity-90 uppercase tracking-wider">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily Swipes Timeline */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-heading font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1184b0]" />
                <span>Daily Biometric Swipe Records</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsRegularizeModalOpen(true)}
                className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-[#1184b0] rounded-xl text-xs font-semibold border border-sky-200 flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Request Missed Swipe</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
              {swipes.map((rec, idx) => {
                const isPresent = rec.status === 'P';
                const isHalf = rec.status === 'P/2';

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-[#1184b0]/40 transition flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isPresent
                            ? 'bg-emerald-100 text-emerald-700'
                            : isHalf
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {rec.status || 'P'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-900 font-heading">
                            {new Date(rec.date + 'T00:00:00').toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          {rec.lateIn && rec.lateIn !== '00:00' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              Late: {rec.lateIn}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                          <span>In: <strong className="text-slate-800">{rec.inTime}</strong></span>
                          <span>•</span>
                          <span>Out: <strong className="text-slate-800">{rec.outTime}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-extrabold text-slate-900 font-heading block">
                        {rec.workTime || '00:00'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Work Duration</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LEAVE & REGULARIZATION REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Leave Balances Header Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Casual Leave (CL)</span>
              <span className="text-2xl font-heading font-extrabold text-sky-600 mt-1 block">
                {leaveBalance ? `${leaveBalance.casualLeave} Days` : '—'}
              </span>
              <span className="text-[10px] text-slate-500">Available balance</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sick Leave (SL)</span>
              <span className="text-2xl font-heading font-extrabold text-emerald-600 mt-1 block">
                {leaveBalance ? `${leaveBalance.sickLeave} Days` : '—'}
              </span>
              <span className="text-[10px] text-slate-500">Available balance</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Earned Leave (EL)</span>
              <span className="text-2xl font-heading font-extrabold text-purple-600 mt-1 block">
                {leaveBalance ? `${leaveBalance.earnedLeave} Days` : '—'}
              </span>
              <span className="text-[10px] text-slate-500">Paid annual leave</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quick Actions</span>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(true)}
                  className="flex-1 py-1.5 px-2.5 bg-[#1184b0] hover:bg-[#0d6c92] text-white rounded-xl text-[11px] font-semibold transition"
                >
                  Apply Leave
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegularizeModalOpen(true)}
                  className="flex-1 py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-semibold transition"
                >
                  Missed Swipe
                </button>
              </div>
            </div>
          </div>

          {/* Submitted Requests List */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-heading font-bold text-slate-900">Submitted Applications & Status</h2>
              <span className="text-xs font-bold text-slate-500">{requests.length} Requests</span>
            </div>

            {requests.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Send className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                <p className="font-bold text-slate-700">No Applications Submitted</p>
                <p className="text-[11px] text-slate-400">Click "Apply Leave" or "Missed Swipe" above to submit a request.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 font-heading">
                          {req.requestType === 'LEAVE' ? `Leave Request (${req.leaveType?.replace('_', ' ')})` : 'Missed Swipe Regularization'}
                        </span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                          {req.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Date: <strong className="text-slate-700">{req.date}</strong> • Reason: "{req.reason}"
                      </p>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SALARY BREAKUP (ANNEXURE K) */}
      {activeTab === 'salary' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-heading font-bold text-slate-900">Annexure K — Salary Breakup (Cost to Company)</h2>
              <p className="text-[10px] text-slate-400">Official monthly earnings & statutory deduction breakdown</p>
            </div>

            <button
              type="button"
              onClick={() => setIsPayslipOpen(true)}
              className="px-3.5 py-2 bg-[#011638] hover:bg-[#02245b] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>View Full Payslip</span>
            </button>
          </div>

          {payrollSummary && payrollSummary.monthlyCtc > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Monthly Earnings Table */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">1. Monthly Earnings</span>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Salary Head</th>
                        <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      <tr>
                        <td className="py-2.5 px-3">Basic Salary (A)</td>
                        <td className="py-2.5 px-3 text-right font-bold">₹{payrollSummary.basicSalary.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3">House Rent Allowance (HRA - C1)</td>
                        <td className="py-2.5 px-3 text-right font-bold">₹{payrollSummary.hra.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3">Special Allowances (C2)</td>
                        <td className="py-2.5 px-3 text-right font-bold">₹{payrollSummary.allowances.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="bg-emerald-50/50 font-bold text-emerald-900">
                        <td className="py-2.5 px-3">Gross Monthly Earnings (D)</td>
                        <td className="py-2.5 px-3 text-right">₹{payrollSummary.grossEarnings.toLocaleString('en-IN')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monthly Deductions Table */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">2. Statutory & Attendance Deductions</span>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Deduction Head</th>
                        <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      <tr>
                        <td className="py-2.5 px-3">Employee Provident Fund (PF - 12%)</td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600">-₹{payrollSummary.pfDeduction.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3">Professional Tax (PT - Slab)</td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600">-₹{payrollSummary.ptDeduction.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3">Attendance Loss of Pay ({payrollSummary.lopDays}d LOP)</td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600">-₹{payrollSummary.lopDeduction.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="bg-sky-50 font-bold text-[#1184b0]">
                        <td className="py-2.5 px-3">Net Take-Home Salary (G)</td>
                        <td className="py-2.5 px-3 text-right text-sm">₹{payrollSummary.netPayable.toLocaleString('en-IN')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
              <p className="text-xs font-semibold text-slate-600">Salary Not Configured Yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                HR/Admin hasn't set up a CTC breakdown for this employee yet, so there's nothing accurate to show here. Contact HR to get this configured.
              </p>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: APPLY FOR LEAVE */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-heading font-bold text-slate-900">Apply for Leave</h2>
            <form onSubmit={handleApplyLeave} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Leave Date</label>
                <input
                  type="date"
                  required
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                >
                  <option value="CASUAL_LEAVE">Casual Leave (CL)</option>
                  <option value="SICK_LEAVE">Sick Leave (SL)</option>
                  <option value="EARNED_LEAVE">Earned Leave (EL)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reason for Leave</label>
                <textarea
                  required
                  rows={3}
                  placeholder="State reason for absence..."
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1184b0] hover:bg-[#0d6c92] text-white font-bold rounded-xl shadow-xs"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REQUEST PUNCH REGULARIZATION */}
      {isRegularizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-heading font-bold text-slate-900">Request Missed Punch Regularization</h2>
            <form onSubmit={handleRegularizePunch} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Date of Missed Punch</label>
                <input
                  type="date"
                  required
                  value={regDate}
                  onChange={(e) => setRegDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">In Time</label>
                  <input
                    type="time"
                    required
                    value={regInTime}
                    onChange={(e) => setRegInTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Out Time</label>
                  <input
                    type="time"
                    required
                    value={regOutTime}
                    onChange={(e) => setRegOutTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reason (e.g. Biometric machine error / Client visit)</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why punch was missed..."
                  value={regReason}
                  onChange={(e) => setRegReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegularizeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1184b0] hover:bg-[#0d6c92] text-white font-bold rounded-xl shadow-xs"
                >
                  Regularize Punch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip & PDF Modal */}
      {isPayslipOpen && (
        <PayslipModal
          isOpen={isPayslipOpen}
          onClose={() => setIsPayslipOpen(false)}
          empCode={selectedEmpCode}
        />
      )}
    </div>
  );
};
