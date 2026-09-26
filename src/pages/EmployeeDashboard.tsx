import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  Plus,
  DollarSign,
  Building2,
  PartyPopper,
  FileText,
  ChevronRight,
  Coffee
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { EmployeeProfile, EmployeePayrollSummary } from '../types';
import { getCurrentMonthCalendarInfo } from '../lib/utils';

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const empCode = user?.empCode || '0132';

  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [payrollData, setPayrollData] = useState<EmployeePayrollSummary | null>(null);
  const [inOutLogs, setInOutLogs] = useState<any[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<{ casualLeave: number; sickLeave: number; earnedLeave: number; compOff: number } | null>(null);
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'CASUAL_LEAVE',
    date: new Date().toISOString().split('T')[0],
    reason: '',
  });
  const [regForm, setRegForm] = useState({
    date: new Date().toISOString().split('T')[0],
    inTime: '09:30',
    outTime: '18:30',
    reason: '',
  });
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Profile
      const profile = await api.getEmployeeProfile(empCode);
      setEmployeeProfile(profile);

      // 2. Fetch Payroll for the current month
      const payroll = await api.getEmployeePayroll(empCode, new Date().toISOString().slice(0, 7));
      setPayrollData(payroll);

      // 3. Fetch In-Out Logs
      const inOut = await api.getInOutAttendance({ employeeCode: empCode, limit: 30 });
      setInOutLogs(inOut?.data || []);

      // 4. Fetch Requests & Balances
      const [reqs, balance, settings] = await Promise.all([
        api.getRequests({ empCode }),
        api.getLeaveBalance(empCode),
        api.getPolicySettings(),
      ]);

      setUserRequests(reqs || []);
      if (balance) setLeaveBalance(balance);
      if (settings?.holidays) setHolidays(settings.holidays);

    } catch (err) {
      console.error('Error loading employee portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployeeData();
  }, [empCode]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createRequest({
        empCode,
        empName: employeeProfile?.name || `Employee ${empCode}`,
        requestType: 'LEAVE',
        leaveType: leaveForm.leaveType as any,
        date: leaveForm.date,
        reason: leaveForm.reason || 'Personal Leave',
      });
      setIsLeaveModalOpen(false);
      setLeaveForm({ leaveType: 'CASUAL_LEAVE', date: new Date().toISOString().split('T')[0], reason: '' });
      setActionSuccess('Leave application submitted successfully!');
      setTimeout(() => setActionSuccess(null), 4000);
      loadEmployeeData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit leave.');
    }
  };

  const handleApplyReg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createRequest({
        empCode,
        empName: employeeProfile?.name || `Employee ${empCode}`,
        requestType: 'MISSED_PUNCH',
        date: regForm.date,
        inTime: regForm.inTime,
        outTime: regForm.outTime,
        reason: regForm.reason || 'Biometric Machine Missed Punch',
      });
      setIsRegModalOpen(false);
      setRegForm({ date: new Date().toISOString().split('T')[0], inTime: '09:30', outTime: '18:30', reason: '' });
      setActionSuccess('Attendance regularization request submitted!');
      setTimeout(() => setActionSuccess(null), 4000);
      loadEmployeeData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit regularization.');
    }
  };

  // Find today's punch record
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = inOutLogs.find((r) => r.date === todayStr);
  const { daysInMonth: daysInCalendarMonth, monthLabel: calendarMonthLabel, monthName: calendarMonthName } =
    getCurrentMonthCalendarInfo();

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Action Notification */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 rounded-2xl flex items-center gap-2.5 font-semibold text-xs shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* 1. Welcome Banner */}
      <div className="bg-gradient-to-r from-[#011638] via-[#093554] to-[#1184b0] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-[#011638]/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-5">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white font-extrabold text-2xl shadow-inner shadow-black/20">
              {employeeProfile?.name ? employeeProfile.name.charAt(0).toUpperCase() : 'E'}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Active Employee
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-500/30">
                  ID: #{empCode}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-heading">
                Welcome, {employeeProfile?.name || `Employee ${empCode}`}
              </h1>
              <p className="text-xs text-sky-100/80 font-medium flex items-center gap-2 mt-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>{employeeProfile?.department || 'Operations'} • {employeeProfile?.location || 'Budigere Facility'}</span>
                <span>•</span>
                <span>General Shift (09:00 - 18:00)</span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="px-4 py-2.5 bg-white text-[#011638] hover:bg-sky-50 text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4 text-[#1184b0]" />
              <span>Apply Leave</span>
            </button>
            <button
              onClick={() => setIsRegModalOpen(true)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all backdrop-blur-md flex items-center gap-2 active:scale-95"
            >
              <Clock className="w-4 h-4 text-sky-300" />
              <span>Regularize Punch</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Summary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Punch Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today's Punch Status</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              todayRecord?.status === 'P' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {todayRecord?.status === 'P' ? 'Present' : 'Active'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-extrabold text-slate-900 font-heading">
              {todayRecord?.inTime || '--:--'}
            </span>
            <span className="text-xs text-slate-500 font-medium">IN</span>
            <span className="text-slate-300">/</span>
            <span className="text-lg font-bold text-slate-700">
              {todayRecord?.outTime || '--:--'}
            </span>
            <span className="text-xs text-slate-500 font-medium">OUT</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#1184b0]" />
            <span>Worked: {todayRecord?.workTime || '00:00'} hrs</span>
          </p>
        </div>

        {/* Month-to-Date Payable Days */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{calendarMonthLabel} Payable Days</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-[#1184b0]">
              Day {new Date().getDate()} of {daysInCalendarMonth}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 font-heading">
              {payrollData?.payableDays ?? 0}
            </span>
            <span className="text-sm font-semibold text-slate-500">/ {payrollData?.monthDays ?? daysInCalendarMonth} Days</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>LOP: {payrollData?.lopDays ?? 0}d (₹{payrollData?.lopDeduction ?? 0} deducted)</span>
          </p>
        </div>

        {/* Take-Home Pay Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estimated Net Salary</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              {calendarMonthName} Take-Home
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-3xl font-extrabold text-emerald-600 font-heading">
              {payrollData?.monthlyCtc ? `₹${(payrollData.netPayable ?? 0).toLocaleString('en-IN')}` : 'Not Configured'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>Gross: ₹{(employeeProfile?.grossSalary ?? 0).toLocaleString('en-IN')}</span>
          </p>
        </div>

        {/* Leave Balances Quick Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Leave Balance</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
              Annual Quota
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center mb-1">
            <div className="bg-sky-50 rounded-xl p-1.5 border border-sky-100">
              <span className="text-xs font-bold text-slate-800 block">{leaveBalance ? `${leaveBalance.casualLeave}d` : '—'}</span>
              <span className="text-[9px] text-slate-500 font-medium">Casual (CL)</span>
            </div>
            <div className="bg-amber-50 rounded-xl p-1.5 border border-amber-100">
              <span className="text-xs font-bold text-slate-800 block">{leaveBalance ? `${leaveBalance.sickLeave}d` : '—'}</span>
              <span className="text-[9px] text-slate-500 font-medium">Sick (SL)</span>
            </div>
            <div className="bg-emerald-50 rounded-xl p-1.5 border border-emerald-100">
              <span className="text-xs font-bold text-slate-800 block">{leaveBalance ? `${leaveBalance.earnedLeave}d` : '—'}</span>
              <span className="text-[9px] text-slate-500 font-medium">Earned (EL)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Biometric Log & Requests */}
        <div className="lg:col-span-2 space-y-6">
          {/* Daily Punch Timesheet Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 font-heading">Recent Biometric Attendance Logs</h2>
                <p className="text-xs text-slate-500">Live device punches & calculated daily hours</p>
              </div>
              <span className="text-xs font-bold text-[#1184b0] bg-sky-50 px-3 py-1 rounded-xl">
                Showing Last 15 Days
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">First IN</th>
                    <th className="py-3 px-4">Last OUT</th>
                    <th className="py-3 px-4">Work Hours</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inOutLogs.slice(0, 15).map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {log.date}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {log.inTime !== '--:--' ? log.inTime : <span className="text-slate-400">--:--</span>}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {log.outTime !== '--:--' ? log.outTime : <span className="text-slate-400">--:--</span>}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {log.workTime} hrs
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'P'
                            ? 'bg-emerald-100 text-emerald-700'
                            : log.status === 'P/2'
                            ? 'bg-amber-100 text-amber-700'
                            : log.status === 'H'
                            ? 'bg-purple-100 text-purple-700'
                            : log.status === 'W'
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          {log.status === 'P'
                            ? 'Present'
                            : log.status === 'P/2'
                            ? 'Half-Day'
                            : log.status === 'H'
                            ? 'Holiday (Paid)'
                            : log.status === 'W'
                            ? 'Weekly Off'
                            : 'Absent (LOP)'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {log.status === 'A' || log.status === 'P/2' ? (
                          <button
                            onClick={() => {
                              setRegForm({ date: log.date, inTime: '09:30', outTime: '18:30', reason: '' });
                              setIsRegModalOpen(true);
                            }}
                            className="text-[10px] font-bold text-[#1184b0] hover:underline"
                          >
                            Regularize
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[10px]">--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Leave & Regularization Requests History */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 font-heading">My Requests & Applications</h2>
                <p className="text-xs text-slate-500">Track status of submitted leaves and punch corrections</p>
              </div>
              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="text-xs font-bold text-[#1184b0] hover:text-[#011638] flex items-center gap-1"
              >
                <span>New Request</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {userRequests.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Coffee className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No requests submitted yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Apply for a leave or punch regularization when needed</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {userRequests.map((req) => (
                  <div key={req.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {req.requestType === 'LEAVE' ? `Leave (${req.leaveType?.replace('_', ' ')})` : 'Missed Punch Correction'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">for {req.date}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">{req.reason}</p>
                    </div>
                    <div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : req.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Salary Breakdown & Corporate Holidays */}
        <div className="space-y-6">
          {/* Salary Breakdown (Annexure K) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1184b0]" />
                <h3 className="text-sm font-bold text-slate-900 font-heading">Salary Breakdown</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{calendarMonthLabel}</span>
            </div>

            {employeeProfile?.monthlyCtc && employeeProfile.monthlyCtc > 0 ? (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Monthly CTC (Gross)</span>
                  <span className="font-bold text-slate-900">₹{employeeProfile.monthlyCtc.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Basic Salary (50%)</span>
                  <span className="font-semibold text-slate-800">₹{(employeeProfile.basicSalary ?? 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">HRA Allowance (20%)</span>
                  <span className="font-semibold text-slate-800">₹{(employeeProfile.hra ?? 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Special Allowance</span>
                  <span className="font-semibold text-slate-800">₹{(employeeProfile.specialAllowance ?? 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 text-rose-600">
                  <span>LOP Deduction ({payrollData?.lopDays ?? 0} Days)</span>
                  <span className="font-bold">-₹{(payrollData?.lopDeduction ?? 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                  <span>Employee PF (EPF)</span>
                  <span className="font-medium">-₹{(employeeProfile.employeePf ?? 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                  <span>Professional Tax (PT)</span>
                  <span className="font-medium">-₹{(payrollData?.ptDeduction ?? 0).toLocaleString('en-IN')}</span>
                </div>

                <div className="pt-2 flex justify-between items-center text-sm font-bold bg-emerald-50/60 p-3 rounded-xl text-emerald-900">
                  <span>Net In-Hand Pay</span>
                  <span className="text-base text-emerald-700 font-extrabold">₹{(payrollData?.netPayable ?? 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
                <p className="text-xs font-semibold text-slate-600">Salary Not Configured Yet</p>
                <p className="text-[11px] text-slate-400 mt-1">Contact HR to get your CTC breakdown set up.</p>
              </div>
            )}
          </div>

          {/* Paid Corporate Holidays */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PartyPopper className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900 font-heading">Corporate Holidays</h3>
              </div>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">Paid</span>
            </div>

            <div className="space-y-2 text-xs">
              {holidays.map((hol) => (
                <div key={hol.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{hol.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{hol.date}</p>
                  </div>
                  <span className="text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                    {hol.type || 'FESTIVAL'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Leave Application Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-scale-in border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1 font-heading">Apply for Leave</h3>
            <p className="text-xs text-slate-500 mb-4">Submit leave request for approval</p>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Leave Category</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1184b0] focus:outline-none"
                >
                  <option value="CASUAL_LEAVE">Casual Leave (CL){leaveBalance ? ` - ${leaveBalance.casualLeave}d Left` : ''}</option>
                  <option value="SICK_LEAVE">Sick Leave (SL){leaveBalance ? ` - ${leaveBalance.sickLeave}d Left` : ''}</option>
                  <option value="EARNED_LEAVE">Earned Leave (EL){leaveBalance ? ` - ${leaveBalance.earnedLeave}d Left` : ''}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={leaveForm.date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1184b0] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Note</label>
                <textarea
                  rows={3}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="e.g. Family function, personal errands, medical appointment..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1184b0] focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-[#1184b0] to-[#011638] text-white rounded-xl shadow-md"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Missed Punch Regularization Modal */}
      {isRegModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-scale-in border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1 font-heading">Regularize Missed Punch</h3>
            <p className="text-xs text-slate-500 mb-4">Request approval for biometric machine missed timestamps</p>

            <form onSubmit={handleApplyReg} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={regForm.date}
                  onChange={(e) => setRegForm({ ...regForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1184b0] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expected IN Time</label>
                  <input
                    type="time"
                    value={regForm.inTime}
                    onChange={(e) => setRegForm({ ...regForm, inTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1184b0] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expected OUT Time</label>
                  <input
                    type="time"
                    value={regForm.outTime}
                    onChange={(e) => setRegForm({ ...regForm, outTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1184b0] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Regularization</label>
                <textarea
                  rows={3}
                  value={regForm.reason}
                  onChange={(e) => setRegForm({ ...regForm, reason: e.target.value })}
                  placeholder="e.g. Device connectivity issue, out of office for client visit..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1184b0] focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-[#1184b0] to-[#011638] text-white rounded-xl shadow-md"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
