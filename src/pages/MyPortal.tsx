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
  LeaveBalance,
  HRMSPolicySettings
} from '../types';
import { PayslipModal } from '../components/payroll/PayslipModal';
import { getCurrentMonthCalendarInfo } from '../lib/utils';
import { EmployeePunchCard } from '../components/attendance/EmployeePunchCard';
import { useAuth } from '../context/AuthContext';

export const MyPortal: React.FC = () => {
  const { user, isSuperAdmin, isFounder, isEmployee } = useAuth();

  const [allEmployees, setAllEmployees] = useState<EmployeeProfile[]>([]);
  const [selectedEmpCode, setSelectedEmpCode] = useState<string>(() => {
    if (user?.role === 'EMPLOYEE' && user.empCode) {
      return user.empCode;
    }
    return localStorage.getItem('colormyles_ess_emp') || user?.empCode || '0132';
  });

  // Search & Filter state for SuperAdmin / Founder Staff Inspector
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');

  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [payrollSummary, setPayrollSummary] = useState<EmployeePayrollSummary | null>(null);
  const [swipes, setSwipes] = useState<InOutRecord[]>([]);
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [policySettings, setPolicySettings] = useState<HRMSPolicySettings | null>(null);
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

  // Calendar matrix is always "this month" — computed from the real date rather
  // than a fixed month, so the portal doesn't go stale once the month changes.
  const { year: currentYear, month: currentMonth, daysInMonth: daysInCalendarMonth, monthLabel: calendarMonthLabel, monthName: calendarMonthName, todayISO, leadingPadding, buildDateStr } =
    getCurrentMonthCalendarInfo();
  const currentMonthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
  const currentMonthEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(daysInCalendarMonth).padStart(2, '0')}`;

  // If logged in as employee, lock selectedEmpCode to user's code
  useEffect(() => {
    if (isEmployee && user?.empCode) {
      setSelectedEmpCode(user.empCode);
    }
  }, [isEmployee, user?.empCode]);

  const loadAllData = async (empCode: string) => {
    setIsLoading(true);
    try {
      const [emps, prof, ps, swRes, pol, reqs, bal] = await Promise.all([
        api.getAllEmployees().catch(() => [] as EmployeeProfile[]),
        api.getEmployeeProfile(empCode).catch(() => null),
        api.getEmployeePayroll(empCode).catch(() => null),
        api.getInOutAttendance({ 
          employeeCode: empCode, 
          fromDate: currentMonthStart, 
          toDate: currentMonthEnd, 
          limit: 100 
        }).catch(() => ({ data: [] as InOutRecord[] })),
        api.getPolicySettings().catch(() => null),
        api.getRequests({ empCode }).catch(() => [] as AttendanceRegularizationRequest[]),
        api.getLeaveBalance(empCode).catch(() => null),
      ]);

      setAllEmployees(emps);
      setProfile(prof || (emps.find(e => e.empCode === empCode) || null));
      setPayrollSummary(ps);
      const validSwipes = (swRes.data || []).filter(
        (r: InOutRecord) => r.date >= currentMonthStart && r.date <= currentMonthEnd
      );
      setSwipes(validSwipes);
      setHolidays(pol?.holidays || []);
      setPolicySettings(pol);
      setRequests(reqs);
      setLeaveBalance(bal);
    } catch (err) {
      console.error('Error loading ESS portal data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isEmployee) {
      localStorage.setItem('colormyles_ess_emp', selectedEmpCode);
    }
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

  // Filtered employees for SuperAdmin/Founder inspection
  const filteredEmployees = allEmployees.filter((emp) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      emp.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      emp.empCode.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      (emp.department && emp.department.toLowerCase().includes(searchTerm.toLowerCase().trim()));

    const matchesDept = departmentFilter === 'ALL' || emp.department === departmentFilter;
    const matchesLoc = locationFilter === 'ALL' || emp.location === locationFilter;

    return matchesSearch && matchesDept && matchesLoc;
  });

  const departments = Array.from(new Set(allEmployees.map(e => e.department).filter(Boolean)));
  const locations = Array.from(new Set(allEmployees.map(e => e.location).filter(Boolean)));

  // Today's punch record for selected employee
  const todayPunchRecord = swipes.find((s) => s.date === todayISO);

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300 w-full">
      {/* 1. SUPERADMIN & FOUNDER: Staff 360° Inspector Bar */}
      {!isEmployee ? (
        <div className="bg-gradient-to-r from-[#011638] via-[#093554] to-[#1184b0] rounded-3xl p-6 sm:p-7 text-white shadow-xl shadow-[#011638]/20 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Staff 360° Dossier
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-400/20 text-sky-200 border border-sky-400/30">
                    {isSuperAdmin ? 'Super Admin Mode' : 'Founder Mode'}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-heading">
                  Staff 360° Inspector: {profile?.name || `Employee #${selectedEmpCode}`}
                </h1>
                <p className="text-xs text-sky-100/80 font-medium mt-0.5">
                  Inspect individual attendance, biometric logs, leave balance, overtime, and salary breakdown for any staff member.
                </p>
              </div>
            </div>

            {/* Search & Staff Picker Controls */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (filteredEmployees.length > 0) {
                  setSelectedEmpCode(filteredEmployees[0].empCode);
                }
              }}
              className="bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-white/20 shadow-lg flex flex-col md:flex-row items-center gap-2.5 text-slate-800"
            >
              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Type staff name or #0132 and press Enter..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filteredEmployees.length > 0) {
                        setSelectedEmpCode(filteredEmployees[0].empCode);
                      }
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#1184b0] focus:bg-white text-slate-900 placeholder:text-slate-400 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none transition shadow-inner font-medium"
                />
              </div>

              {/* Department Filter */}
              {departments.length > 0 && (
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#1184b0] focus:bg-white transition w-full md:w-auto shadow-xs"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              )}

              {/* Location Filter */}
              {locations.length > 0 && (
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#1184b0] focus:bg-white transition w-full md:w-auto shadow-xs"
                >
                  <option value="ALL">All Locations</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              )}

              {/* Employee Direct Dropdown */}
              <select
                value={selectedEmpCode}
                onChange={(e) => setSelectedEmpCode(e.target.value)}
                className="bg-gradient-to-r from-[#011638] to-[#1184b0] text-white font-bold text-xs rounded-xl px-3.5 py-2.5 focus:outline-none transition w-full md:w-auto shadow-md"
              >
                {filteredEmployees.map((emp) => (
                  <option key={emp.empCode} value={emp.empCode} className="bg-slate-900 text-white">
                    #{emp.empCode} — {emp.name} ({emp.department || 'Staff'})
                  </option>
                ))}
              </select>

              {/* Inspect Button */}
              <button
                type="submit"
                className="w-full md:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Inspect</span>
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* 2. EMPLOYEE: Personal Welcome Banner */
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

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-[#1184b0] to-[#011638] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Apply Leave
            </button>
            <button
              onClick={() => setIsRegularizeModalOpen(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition"
            >
              <Clock className="w-3.5 h-3.5 text-[#1184b0]" /> Regularize
            </button>
          </div>
        </div>
      )}

      {/* Success Notification Alert */}
      {requestSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{requestSuccess}</span>
        </div>
      )}

      {/* 3. Punch Widget: Only render Punch Controls for Employee */}
      {isEmployee ? (
        <EmployeePunchCard
          empCode={selectedEmpCode}
          empName={profile?.name}
          onPunchSuccess={() => loadAllData(selectedEmpCode)}
        />
      ) : (
        /* For SuperAdmin / Founder: Show Today's Biometric Activity for Selected Staff */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#1184b0] shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Today's Biometric Log ({todayISO})
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  todayPunchRecord?.status === 'P'
                    ? 'bg-emerald-100 text-emerald-800'
                    : todayPunchRecord?.inTime && todayPunchRecord.inTime !== '--:--'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {todayPunchRecord?.statusLabel || (todayPunchRecord?.inTime !== '--:--' ? 'Punched' : 'No Swipe Today')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                IN: <strong className="text-slate-800 font-mono">{todayPunchRecord?.inTime || '--:--'}</strong> • OUT: <strong className="text-slate-800 font-mono">{todayPunchRecord?.outTime || '--:--'}</strong> • Total Work: <strong className="text-slate-800">{todayPunchRecord?.workTime || '00:00'} hrs</strong>
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shrink-0">
            <Building2 className="w-3.5 h-3.5 text-[#1184b0]" />
            <span>Enrolled Unit: <strong className="text-slate-800">{profile?.location || 'Budigere Facility'}</strong></span>
          </div>
        </div>
      )}

      {/* Key Metric Highlights (Month-to-Date) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
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

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overtime (OT)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-heading font-extrabold text-violet-600">
              {payrollSummary?.totalOtHours ?? 0}h
            </span>
          </div>
          <span className="text-[10px] text-violet-600 font-semibold block mt-0.5">
            {payrollSummary && payrollSummary.otEarnings > 0
              ? `+₹${payrollSummary.otEarnings.toLocaleString('en-IN')} Earned`
              : '0h Overtime'}
          </span>
        </div>

        <div className="p-4 bg-gradient-to-br from-[#011638] to-[#1184b0] text-white rounded-2xl shadow-md flex flex-col justify-between col-span-2 sm:col-span-1">
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
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1 rounded-2xl text-xs font-semibold">
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
              <div className="flex flex-wrap items-center gap-3 text-[10px]">
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

                const fullDayMin = policySettings?.shift?.fullDayThresholdMinutes || 360;
                const halfDayMin = policySettings?.shift?.halfDayThresholdMinutes || 180;
                const minCheckout = policySettings?.shift?.minCheckoutForFullDay || '16:00';

                const workMin = record?.workMinutes || 0;
                const outTimeStr = (record?.outTime && record.outTime !== '--:--') ? record.outTime.slice(0, 5) : '';
                const meetsFullDayCheckout = Boolean(outTimeStr && outTimeStr >= minCheckout && workMin >= halfDayMin);
                const isFullWork = workMin >= fullDayMin || meetsFullDayCheckout;

                const hasIn = Boolean(record?.inTime && record.inTime !== '--:--');
                const hasOut = Boolean(record?.outTime && record.outTime !== '--:--');
                const isForgotSwipe = !isSunday && !isHoliday && record?.status === 'A' && hasIn !== hasOut && !isFullWork;

                const isPresent = !isSunday && !isHoliday && (
                  record?.status === 'P' || 
                  record?.status === 'PRESENT' || 
                  isFullWork || 
                  (record && record.inTime && record.inTime !== '--:--' && record.status !== 'A' && isFullWork)
                );

                const isHalf = !isSunday && !isHoliday && !isPresent && !isForgotSwipe && (
                  record?.status === 'P/2' || 
                  record?.status === 'HALF' || 
                  (record && workMin >= halfDayMin)
                );

                const isAbsent = !isSunday && !isHoliday && !isFuture && (!record || record.status === 'A' || (record && workMin < halfDayMin && !hasIn)) && !isForgotSwipe && !isHalf && !isPresent;

                let bgClass = 'bg-slate-50 border-slate-200 text-slate-500';
                let label = '—';

                if (isHoliday) {
                  bgClass = 'bg-purple-600 border-purple-700 text-white font-bold shadow-xs';
                  label = 'HL';
                } else if (isSunday) {
                  bgClass = 'bg-slate-100/80 border-slate-200 text-slate-500 font-semibold';
                  label = 'WO';
                } else if (isForgotSwipe) {
                  bgClass = 'bg-orange-400 border-orange-500 text-slate-950 font-bold shadow-xs';
                  label = 'FS';
                } else if (isHalf) {
                  bgClass = 'bg-amber-400 border-amber-500 text-slate-950 font-bold shadow-xs';
                  label = 'P/2';
                } else if (isPresent) {
                  bgClass = 'bg-emerald-500 border-emerald-600 text-white font-bold shadow-xs';
                  label = 'P';
                } else if (isAbsent) {
                  bgClass = 'bg-rose-500 border-rose-600 text-white font-bold shadow-xs';
                  label = 'A';
                }

                return (
                  <div
                    key={dayNum}
                    className={`h-10 sm:h-13 rounded-xl border flex flex-col items-center justify-center p-1 text-xs transition-all ${bgClass}`}
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
                const holidayMatch = holidays.find((h) => h.date === rec.date);
                const isHoliday = Boolean(holidayMatch) || rec.status === 'HL' || rec.status === 'H';
                const isSunday = new Date(rec.date + 'T00:00:00').getDay() === 0 || rec.status === 'W' || rec.status === 'WO';
                const isPresent = rec.status === 'P';
                const isHalf = rec.status === 'P/2';
                const hasIn = Boolean(rec.inTime && rec.inTime !== '--:--');
                const hasOut = Boolean(rec.outTime && rec.outTime !== '--:--');
                const isForgotSwipe = !isHoliday && !isSunday && rec.status === 'A' && hasIn !== hasOut;

                let badgeColor = 'bg-rose-100 text-rose-700 border-rose-200';
                let badgeText = rec.status || 'A';

                if (isHoliday) {
                  badgeColor = 'bg-purple-100 text-purple-700 border-purple-200';
                  badgeText = 'HL';
                } else if (isSunday) {
                  badgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
                  badgeText = 'WO';
                } else if (isForgotSwipe) {
                  badgeColor = 'bg-orange-100 text-orange-800 border-orange-200';
                  badgeText = 'FS';
                } else if (isPresent) {
                  badgeColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                  badgeText = 'P';
                } else if (isHalf) {
                  badgeColor = 'bg-amber-100 text-amber-700 border-amber-200';
                  badgeText = 'P/2';
                }

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-[#1184b0]/40 transition flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs ${badgeColor}`}
                      >
                        {badgeText}
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
                          {isHoliday && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                              {holidayMatch?.name || 'Corporate Holiday (Paid)'}
                            </span>
                          )}
                          {isSunday && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                              Weekly Off
                            </span>
                          )}
                          {isForgotSwipe && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200">
                              Missed Swipe
                            </span>
                          )}
                          {rec.lateIn && rec.lateIn !== '00:00' && !isHoliday && !isSunday && (
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
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                          req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                          'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Date: <strong className="text-slate-700">{req.date}</strong> • Reason: "{req.reason}"
                      </p>
                      {req.reviewedBy && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          Reviewed by <strong className="text-slate-600">{req.reviewedBy}</strong>
                          {req.reviewComment && ` • "${req.reviewComment}"`}
                        </p>
                      )}
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
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-[#1184b0] text-white rounded">
                  Official Document
                </span>
                <h2 className="text-base font-heading font-extrabold text-slate-900">Annexure K — Breakup of CTC</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">ColorMyles Annual & Monthly Compensation & Statutory Cost Breakdown</p>
            </div>

            <button
              type="button"
              onClick={() => setIsPayslipOpen(true)}
              className="px-4 py-2 bg-[#011638] hover:bg-[#02245b] text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-xs"
            >
              <FileText className="w-4 h-4 text-sky-400" />
              <span>Generate Monthly Payslip</span>
            </button>
          </div>

          {payrollSummary && payrollSummary.monthlyCtc > 0 ? (
            <div className="space-y-6">
              {/* Employee Metadata Header Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Employee Name</span>
                  <span className="font-extrabold text-slate-900 text-sm">{profile?.name || payrollSummary.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Department</span>
                  <span className="font-bold text-slate-800">{profile?.department || 'Digital Marketing'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Designation</span>
                  <span className="font-bold text-slate-800">{profile?.designation || 'Full Stack Developer'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Date of Joining (DOJ)</span>
                  <span className="font-bold text-slate-800">{profile?.doj || '01-09-2026'}</span>
                </div>
              </div>

              {/* Full Annexure K Matrix Table */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-extrabold">
                      <th className="py-3 px-4">PARTICULARS</th>
                      <th className="py-3 px-4 text-right w-48">Salary PA (Rs.)</th>
                      <th className="py-3 px-4 text-right w-48">Salary PM (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {/* Basic (A) */}
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">Basic (A)</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                        ₹{(payrollSummary.basicSalary * 12).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{payrollSummary.basicSalary.toLocaleString('en-IN')}
                      </td>
                    </tr>

                    {/* Fixed Salary (B) */}
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">Fixed Salary (B)</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                        ₹{((profile?.fixedSalary || payrollSummary.basicSalary) * 12).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{(profile?.fixedSalary || payrollSummary.basicSalary).toLocaleString('en-IN')}
                      </td>
                    </tr>

                    {/* HRA (C1) */}
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">HRA (C1)</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                        ₹{(payrollSummary.hra * 12).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{payrollSummary.hra.toLocaleString('en-IN')}
                      </td>
                    </tr>

                    {/* Special Allowance (C2) */}
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">Special Allowance (C2)</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                        ₹{(payrollSummary.allowances * 12).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{payrollSummary.allowances.toLocaleString('en-IN')}
                      </td>
                    </tr>

                    {/* Gross Salary (D) */}
                    <tr className="bg-slate-100 font-bold text-slate-900 border-y border-slate-200">
                      <td className="py-3 px-4 text-slate-900 font-extrabold">Gross Salary (D)</td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold">
                        ₹{((payrollSummary.grossSalary || (payrollSummary.basicSalary + payrollSummary.hra + payrollSummary.allowances)) * 12).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-sm text-slate-950">
                        ₹{(payrollSummary.grossSalary || (payrollSummary.basicSalary + payrollSummary.hra + payrollSummary.allowances)).toLocaleString('en-IN')}
                      </td>
                    </tr>

                    {/* Employee's Contribution to PF (E) */}
                    <tr className="hover:bg-slate-50/80 text-rose-700">
                      <td className="py-2.5 px-4">Employee's Contribution to PF (E)</td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        ₹{(payrollSummary.pfDeduction * 12).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold">
                        ₹{payrollSummary.pfDeduction.toLocaleString('en-IN')}
                      </td>
                    </tr>

                    {/* Employee's Contribution to ESIC (F) */}
                    <tr className="hover:bg-slate-50/80 text-slate-400">
                      <td className="py-2.5 px-4">Employee's Contribution to ESIC (F)</td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        {payrollSummary.esiDeduction > 0 ? `₹${(payrollSummary.esiDeduction * 12).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        {payrollSummary.esiDeduction > 0 ? `₹${payrollSummary.esiDeduction.toLocaleString('en-IN')}` : '—'}
                      </td>
                    </tr>

                    {/* Total Net Salary (G) */}
                    <tr className="bg-sky-50/80 font-bold text-slate-900 border-y border-sky-200">
                      <td className="py-3 px-4 text-sky-950 font-extrabold">Total Net Salary (G)</td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-sky-950">
                        ₹{((payrollSummary.totalNetSalary || (payrollSummary.grossSalary ? payrollSummary.grossSalary - payrollSummary.pfDeduction : payrollSummary.monthlyCtc - 3800)) * 12).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-sm text-[#1184b0]">
                        ₹{(payrollSummary.totalNetSalary || (payrollSummary.grossSalary ? payrollSummary.grossSalary - payrollSummary.pfDeduction : payrollSummary.monthlyCtc - 3800)).toLocaleString('en-IN')}
                      </td>
                    </tr>

                    {/* Employer's Contribution to PF (H) */}
                    <tr className="hover:bg-slate-50/80 text-indigo-700">
                      <td className="py-2.5 px-4">Employer's Contribution to PF (H)</td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        ₹{((payrollSummary.employerPf ?? payrollSummary.pfDeduction) * 12).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold">
                        ₹{(payrollSummary.employerPf ?? payrollSummary.pfDeduction).toLocaleString('en-IN')}
                      </td>
                    </tr>

                    {/* Employer's Contribution to ESIC (I) */}
                    <tr className="hover:bg-slate-50/80 text-slate-400">
                      <td className="py-2.5 px-4">Employer's Contribution to ESIC (I)</td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        {payrollSummary.employerEsic && payrollSummary.employerEsic > 0 ? `₹${(payrollSummary.employerEsic * 12).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        {payrollSummary.employerEsic && payrollSummary.employerEsic > 0 ? `₹${payrollSummary.employerEsic.toLocaleString('en-IN')}` : '—'}
                      </td>
                    </tr>

                    {/* PT (J) */}
                    <tr className="hover:bg-slate-50/80 text-slate-700">
                      <td className="py-2.5 px-4">PT (Professional Tax) (J)</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                        ₹{(payrollSummary.ptDeduction * 12).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{payrollSummary.ptDeduction.toLocaleString('en-IN')}
                      </td>
                    </tr>

                    {/* Minimum Bonus (K) */}
                    <tr className="hover:bg-slate-50/80 text-slate-400">
                      <td className="py-2.5 px-4">Minimum Bonus (K)</td>
                      <td className="py-2.5 px-4 text-right font-mono">—</td>
                      <td className="py-2.5 px-4 text-right font-mono">—</td>
                    </tr>

                    {/* Total Gross CTC (L) */}
                    <tr className="bg-slate-900 text-white font-extrabold text-sm border-t-2 border-slate-900">
                      <td className="py-3 px-4">Total Gross CTC (L)</td>
                      <td className="py-3 px-4 text-right font-mono">
                        ₹{(payrollSummary.monthlyCtc * 12).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-300 font-extrabold text-base">
                        ₹{payrollSummary.monthlyCtc.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Net Take Home Highlight Box — shows the real MTD payable amount
                  (netPayable), which reflects this month's actual OT/LOP, not the
                  fixed Annexure K reference figure (Row G) shown in the table above. */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">This Month's Take-Home Bank Credit</span>
                  <p className="text-xs text-emerald-700">
                    Live month-to-date accrual ({payrollSummary.elapsedDays ?? 0}/{payrollSummary.monthDays ?? daysInCalendarMonth} days elapsed) of Total Net Salary (G: ₹{(payrollSummary.totalNetSalary || 26200).toLocaleString('en-IN')})
                    {payrollSummary.otEarnings > 0 && <> + OT Earned (₹{payrollSummary.otEarnings.toLocaleString('en-IN')})</>}
                    {payrollSummary.lopDays > 0 && <> − Loss of Pay ({payrollSummary.lopDays}d: ₹{payrollSummary.lopDeduction.toLocaleString('en-IN')})</>}
                    {' '}
                    ({payrollSummary.lopDays > 0 ? `${payrollSummary.lopDays} unpaid day(s) this month` : '0 LOP so far this month'})
                  </p>
                </div>
                <span className="text-2xl font-heading font-extrabold text-emerald-800 font-mono">
                  ₹{(payrollSummary.netPayable ?? payrollSummary.totalNetSalary ?? 26200).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
              <p className="text-xs font-semibold text-slate-600">Salary Not Configured Yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                HR/Admin hasn't set up a CTC breakdown for this employee yet. Contact HR to get this configured.
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
