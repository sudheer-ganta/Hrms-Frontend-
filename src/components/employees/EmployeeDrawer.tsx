import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Building2,
  Clock,
  TrendingUp,
  CalendarCheck,
  Edit3,
  DollarSign
} from 'lucide-react';
import { EmployeeTimesheet, InOutRecord, EmployeeProfile, EmployeePayrollSummary, CompanyHoliday, HRMSPolicySettings } from '../../types';
import { api } from '../../services/api';
import { EditEmployeeModal } from './EditEmployeeModal';
import { PayslipModal } from '../payroll/PayslipModal';
import { getCurrentMonthCalendarInfo } from '../../lib/utils';

interface EmployeeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employee: {
    employeeCode: string;
    employeeName: string;
    sourceName: string;
    sourceId?: string;
  } | null;
  timesheet?: EmployeeTimesheet | null;
  records?: InOutRecord[];
}

export const EmployeeDrawer: React.FC<EmployeeDrawerProps> = ({
  isOpen,
  onClose,
  employee,
  timesheet,
  records = [],
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'calendar'>('overview');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [payrollSummary, setPayrollSummary] = useState<EmployeePayrollSummary | null>(null);
  const [fetchedRecords, setFetchedRecords] = useState<InOutRecord[]>([]);
  const [localTimesheet, setLocalTimesheet] = useState<EmployeeTimesheet | null>(null);
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [policySettings, setPolicySettings] = useState<HRMSPolicySettings | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Calendar matrix is always "this month" — computed from the real date rather
  // than a fixed month, so the drawer doesn't go stale once the month changes.
  const { year: calYear, month: calMonth, daysInMonth: calDays, monthLabel: calMonthLabel, todayISO: calTodayISO, leadingPadding: calLeadingPadding, buildDateStr: calBuildDateStr } =
    getCurrentMonthCalendarInfo();
  const calMonthStart = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
  const calMonthEnd = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(calDays).padStart(2, '0')}`;

  useEffect(() => {
    if (!isOpen || !employee?.employeeCode) return;

    let isMounted = true;
    setLoadingDetails(true);

    // 1. Employee Profile
    api.getEmployeeProfile(employee.employeeCode)
      .then((p) => {
        if (isMounted) setProfile(p);
      })
      .catch(() => {});

    // 2. Payroll Math
    api.getEmployeePayroll(employee.employeeCode)
      .then((ps) => {
        if (isMounted) setPayrollSummary(ps);
      })
      .catch(() => {});

    // 3. Corporate Holidays List & Policy
    api.getPolicySettings()
      .then((pol) => {
        if (isMounted && pol) {
          setPolicySettings(pol);
          if (pol.holidays) setHolidays(pol.holidays);
        }
      })
      .catch(() => {});

    // 4. Employee-specific InOut Swipes
    api.getInOutAttendance({ 
      employeeCode: employee.employeeCode, 
      fromDate: calMonthStart,
      toDate: calMonthEnd,
      limit: 100 
    })
      .then((res) => {
        if (isMounted && res.data) {
          const monthRecords = (res.data || []).filter(
            (r: any) => r.date >= calMonthStart && r.date <= calMonthEnd
          );
          setFetchedRecords(monthRecords);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingDetails(false);
      });

    // 5. Employee Timesheet for Calendar Grid
    api.getTimesheet({ fromDate: calMonthStart, toDate: calMonthEnd, search: employee.employeeCode })
      .then((res) => {
        if (isMounted && res.data && res.data.length > 0) {
          const matched = res.data.find((t) => t.employeeCode === employee.employeeCode) || res.data[0];
          setLocalTimesheet(matched);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isOpen, employee?.employeeCode]);

  if (!isOpen || !employee) return null;

  // Use fetched employee records or prop fallback
  const employeeRecords = (fetchedRecords.length > 0 ? fetchedRecords : records.filter((r) => r.employeeCode === employee.employeeCode && r.date >= calMonthStart && r.date <= calMonthEnd))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Compute stats
  const totalPresent = payrollSummary?.payableDays ?? payrollSummary?.presentDays ?? (timesheet?.totalDaysPresent ?? employeeRecords.filter((r) => r.status === 'P').length);
  const totalLop = payrollSummary?.lopDays !== undefined ? payrollSummary.lopDays : (payrollSummary?.absentDays ?? (timesheet?.totalDaysAbsent ?? employeeRecords.filter((r) => r.status === 'A').length));
  const totalHalfDays = payrollSummary?.halfDays ?? employeeRecords.filter((r) => r.status === 'P/2' || r.status.includes('1/2')).length;
  const totalWorkHours = payrollSummary?.totalWorkHours ?? (timesheet?.totalWorkMinutes ? Number((timesheet.totalWorkMinutes / 60).toFixed(1)) : 0);
  const attendanceRate = payrollSummary ? Math.round((payrollSummary.payableDays / (payrollSummary.monthDays || 30)) * 100) : 92;

  const initials = (profile?.name || employee.employeeName)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'EM';

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
        <div 
          className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300 border-l border-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Header */}
          <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-sky-50/30">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#1184b0] to-[#011638] text-white flex items-center justify-center font-heading font-extrabold text-base shadow-md shadow-brand-500/20">
                  {initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading font-extrabold text-lg text-slate-900">
                      {profile?.name || employee.employeeName}
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {profile?.department || 'Enrolled'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5">
                    <span className="font-bold text-brand-600">ID: {employee.employeeCode}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {employee.sourceName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  className="p-2 rounded-xl text-slate-600 hover:text-brand-600 hover:bg-sky-50 transition border border-slate-200"
                  title="Edit Profile & Salary"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Action Bar (Payslip & Profile Edit) */}
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => setIsPayslipOpen(true)}
                className="flex-1 py-2 px-3 bg-[#011638] hover:bg-[#022359] text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition"
              >
                <DollarSign className="w-3.5 h-3.5 text-sky-400" />
                <span>Monthly Payslip & Email</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5 transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#1184b0]" />
                <span>Salary / CTC</span>
              </button>
            </div>

            {/* KPI Mini-Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payable</span>
                <span className="text-sm font-extrabold font-heading text-emerald-600 mt-0.5 block">{totalPresent}d</span>
                <span className="text-[9px] text-slate-400 font-medium block">of {payrollSummary?.monthDays || 25}d</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">LOP</span>
                <span className="text-sm font-extrabold font-heading text-rose-600 mt-0.5 block">{totalLop}d</span>
                <span className="text-[9px] text-slate-400 font-medium block">Loss of Pay</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Work Hrs</span>
                <span className="text-sm font-extrabold font-heading text-indigo-600 mt-0.5 block">{totalWorkHours}h</span>
                <span className="text-[9px] text-slate-400 font-medium block">Regular</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">OT Hours</span>
                <span className="text-sm font-extrabold font-heading text-violet-600 mt-0.5 block">{payrollSummary?.totalOtHours || 0}h</span>
                <span className="text-[9px] text-violet-600 font-semibold block">{payrollSummary && payrollSummary.otEarnings > 0 ? `+₹${payrollSummary.otEarnings.toLocaleString('en-IN')}` : '0 OT'}</span>
              </div>
              {/* Est Net Pay Card */}
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Est. Net Pay</span>
                <span className="text-sm font-extrabold font-heading text-[#1184b0] mt-0.5 block">
                  {payrollSummary && payrollSummary.monthlyCtc > 0 && payrollSummary.netPayable > 0
                    ? `₹${payrollSummary.netPayable.toLocaleString('en-IN')}`
                    : '—'}
                </span>
                <span className="text-[9px] text-emerald-600 font-semibold block">Take-Home</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 mt-4 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'overview'
                    ? 'bg-white text-brand-600 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Overview & Profile</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'timeline'
                    ? 'bg-white text-brand-600 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Swipes ({employeeRecords.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'calendar'
                    ? 'bg-white text-brand-600 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Monthly Grid</span>
              </button>
            </div>
          </div>

          {/* Scrollable Tab Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                {/* Employee Details Profile Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 font-heading flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#1184b0]" /> Employee Profile Details
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditOpen(true)}
                      className="text-[11px] font-bold text-brand-600 hover:underline"
                    >
                      Edit Info
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Date of Birth (DOB)</span>
                      <span className="font-bold text-slate-800">{profile?.dob || '—'}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Official Email</span>
                      <span className="font-bold text-slate-800 truncate block">{profile?.email || '—'}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Monthly CTC Base</span>
                      <span className="font-bold text-emerald-700">
                        {profile?.monthlyCtc ? `₹${profile.monthlyCtc.toLocaleString('en-IN')}` : '—'}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-medium">Bank A/C Number</span>
                      <span className="font-mono font-bold text-slate-800">{profile?.bankAccount || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Live Salary Estimation Card */}
                {payrollSummary && payrollSummary.monthlyCtc > 0 ? (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50/50 border border-sky-200/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-950 font-heading flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-[#1184b0]" />
                        Monthly Payroll & Net Pay Math
                      </span>
                      <span className="text-[11px] font-bold text-sky-700">{payrollSummary.month}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-sky-100">
                        <span className="text-[10px] text-slate-400 block">Payable / Total Days</span>
                        <span className="font-extrabold text-slate-800">{payrollSummary.payableDays} / {payrollSummary.monthDays} Days</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-sky-100">
                        <span className="text-[10px] text-slate-400 block">Work Hours</span>
                        <span className="font-extrabold text-emerald-600">{payrollSummary.totalWorkHours}h</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-sky-100">
                        <span className="text-[10px] text-slate-400 block">Overtime (OT)</span>
                        <span className="font-extrabold text-violet-600">
                          {payrollSummary.totalOtHours}h {payrollSummary.otEarnings > 0 ? `(+₹${payrollSummary.otEarnings.toLocaleString('en-IN')})` : ''}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-sky-100">
                        <span className="text-[10px] text-slate-400 block">Loss of Pay (LOP)</span>
                        <span className="font-extrabold text-rose-600">-₹{payrollSummary.lopDeduction} ({payrollSummary.lopDays}d)</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-sky-100 sm:col-span-2">
                        <span className="text-[10px] text-slate-400 block">Take-Home Salary</span>
                        <span className="font-extrabold text-[#1184b0] text-sm">₹{payrollSummary.netPayable.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1.5">
                    <DollarSign className="w-5 h-5 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">Salary Not Configured</p>
                    <p className="text-[11px] text-slate-400">SuperAdmin has not assigned a monthly CTC structure to this employee yet.</p>
                  </div>
                )}

                {/* Shift Policy info */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 font-heading">Shift & Grace Policy</span>
                    <span className="text-xs font-bold text-brand-600 bg-sky-100/70 px-2 py-0.5 rounded-md">General Shift</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-bold">Standard Timing</span>
                      <span className="font-extrabold text-slate-800">09:00 AM – 06:00 PM</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-bold">Grace Period</span>
                      <span className="font-extrabold text-slate-800">15 Minutes (09:15 AM)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PUNCH TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="space-y-3">
                {employeeRecords.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-medium">
                    No punch records synced yet for this employee.
                  </div>
                ) : (
                  employeeRecords.map((rec, idx) => {
                    const holidayMatch = holidays.find((h) => h.date === rec.date);
                    const isHoliday = Boolean(holidayMatch) || rec.status === 'HL' || rec.status === 'H';
                    const isSunday = new Date(rec.date + 'T00:00:00').getDay() === 0 || rec.status === 'W' || rec.status === 'WO';
                    const isPresent = rec.status === 'P';
                    const isHalf = rec.status === 'P/2' || rec.status.includes('1/2');
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
                        className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-brand-500/40 transition-all flex items-center justify-between shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-xs ${badgeColor}`}
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
                                  {holidayMatch?.name || 'Corporate Holiday'}
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
                              {rec.overTime && rec.overTime !== '00:00' && rec.overTime !== '--:--' && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  OT: {rec.overTime}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                              <span>In: <strong className="text-slate-700">{rec.inTime}</strong></span>
                              <span>•</span>
                              <span>Out: <strong className="text-slate-700">{rec.outTime}</strong></span>
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
                  })
                )}
              </div>
            )}

            {/* TAB 3: CALENDAR MATRIX */}
            {activeTab === 'calendar' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                  <span className="font-heading font-bold text-slate-800">{calMonthLabel} Attendance Grid</span>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" /> Present</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" /> Half-Day</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-600 shadow-xs" /> Holiday</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs" /> Absent</span>
                    <span className="flex items-center gap-1.5" title="Only check-in or check-out was recorded, not both"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-xs" /> Forgot Swipe</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 shadow-xs" /> Weekly Off</span>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <div key={day} className="text-center text-[11px] font-extrabold text-slate-400 uppercase py-1">
                      {day}
                    </div>
                  ))}

                  {/* Leading offset padding so day 1 lands on its correct weekday column */}
                  {Array.from({ length: calLeadingPadding }, (_, pIdx) => (
                    <div key={`pad-${pIdx}`} className="h-12 rounded-xl bg-slate-50/50 border border-transparent" />
                  ))}

                  {/* Day 1 to end-of-month grid */}
                  {Array.from({ length: calDays }, (_, i) => {
                    const dayNum = i + 1;
                    const dateStr = calBuildDateStr(dayNum);
                    const activeTimesheet = localTimesheet || timesheet;
                    const record = activeTimesheet?.days?.[dateStr] || employeeRecords.find((r) => r.date === dateStr);
                    const isSunday = new Date(dateStr + 'T00:00:00').getDay() === 0;
                    const isFuture = dateStr > calTodayISO;
                    const holidayMatch = holidays.find((h) => h.date === dateStr);
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
                    let subtext = '';

                    if (isHoliday) {
                      bgClass = 'bg-purple-600 border-purple-700 text-white font-bold shadow-xs';
                      label = 'HL';
                      subtext = holidayMatch?.name || 'Holiday';
                    } else if (isSunday) {
                      bgClass = 'bg-slate-100/80 border-slate-200 text-slate-500 font-semibold';
                      label = 'WO';
                      subtext = 'Sunday';
                    } else if (isForgotSwipe) {
                      bgClass = 'bg-orange-400 border-orange-500 text-slate-950 font-bold shadow-xs';
                      label = 'FS';
                      subtext = `Forgot ${hasIn ? 'Check-Out' : 'Check-In'}`;
                    } else if (isHalf) {
                      bgClass = 'bg-amber-400 border-amber-500 text-slate-950 font-bold shadow-xs';
                      label = 'P/2';
                      subtext = 'Half Day';
                    } else if (isPresent) {
                      bgClass = 'bg-emerald-500 border-emerald-600 text-white font-bold shadow-xs';
                      label = 'P';
                      subtext = record?.workTime || 'Present';
                    } else if (isAbsent) {
                      bgClass = 'bg-rose-500 border-rose-600 text-white font-bold shadow-xs';
                      label = 'A';
                      subtext = 'Absent';
                    } else if (isFuture) {
                      bgClass = 'bg-sky-50/40 border-slate-200 text-slate-400';
                      label = '—';
                      subtext = 'Scheduled';
                    }

                    return (
                      <div
                        key={dayNum}
                        className={`h-10 sm:h-12 rounded-xl border flex flex-col items-center justify-center p-1 text-xs transition-all ${bgClass}`}
                        title={isHoliday ? `${dateStr}: ${holidayMatch?.name} (Corporate Holiday - Full Pay)` : record ? `${dateStr}: In ${record.inTime || '--'}, Out ${record.outTime || '--'} (${record.status})` : `${dateStr} (${label})`}
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
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">
              Employee Master Synced with e-Timeoffice
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all"
            >
              Close Drawer
            </button>
          </div>
        </div>
      </div>

      {/* Edit Profile & Salary Modal */}
      <EditEmployeeModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        empCode={employee.employeeCode}
        onSaved={(updated) => {
          setProfile(updated);
          // Refresh payroll math
          api.getEmployeePayroll(employee.employeeCode).then(setPayrollSummary).catch(() => {});
        }}
      />

      {/* Payslip & Email Modal */}
      <PayslipModal
        isOpen={isPayslipOpen}
        onClose={() => setIsPayslipOpen(false)}
        empCode={employee.employeeCode}
      />
    </>
  );
};
