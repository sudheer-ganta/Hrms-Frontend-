import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Clock,
  Calendar,
  RefreshCw,
  Building2,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Play,
  Pause,
  Timer,
  CalendarDays,
  Check,
  Lock,
  Unlock,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { AttendanceSource, HRMSPolicySettings, SchedulerStatus, PayrollRunStatus, PolicyUpdate, DAY_NAMES, DayName, Site } from '../types';
import { errorMessage } from '../lib/apiError';
import { istMonth, formatBusinessDate, formatInstantIst } from '../lib/businessDate';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { PayrollCloseReviewModal } from '../components/settings/PayrollCloseReviewModal';

interface SettingsPageProps {
  sources: AttendanceSource[];
}

const currentMonthKey = () => istMonth();

export const Settings: React.FC<SettingsPageProps> = ({ sources }) => {
  const { isSuperAdmin } = useAuth();
  const [pageError, setPageError] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [siteDrafts, setSiteDrafts] = useState<Record<string, { lat: string; lng: string; radiusM: string }>>({});
  const [newHolidayPaid, setNewHolidayPaid] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'policy' | 'holidays' | 'scheduler' | 'sources' | 'payroll'>('policy');
  const [policy, setPolicy] = useState<HRMSPolicySettings | null>(null);
  const [scheduler, setScheduler] = useState<SchedulerStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Payroll Closing
  const [payrollMonth, setPayrollMonth] = useState<string>(currentMonthKey());
  const [payrollRunStatus, setPayrollRunStatus] = useState<PayrollRunStatus | null>(null);
  const [payrollRunHistory, setPayrollRunHistory] = useState<PayrollRunStatus[]>([]);
  const [isPayrollLoading, setIsPayrollLoading] = useState<boolean>(false);
  const [payrollActionError, setPayrollActionError] = useState<string | null>(null);
  const [isPayrollActionBusy, setIsPayrollActionBusy] = useState<boolean>(false);
  const [isPayrollReviewOpen, setIsPayrollReviewOpen] = useState<boolean>(false);

  // New Holiday form state
  const [newHolidayDate, setNewHolidayDate] = useState<string>('');
  const [newHolidayName, setNewHolidayName] = useState<string>('');
  const [newHolidayType, setNewHolidayType] = useState<'NATIONAL' | 'FESTIVAL' | 'OPTIONAL'>('NATIONAL');

  const loadSettingsData = async () => {
    setIsLoading(true);
    try {
      const [policyData, schedulerData, siteData] = await Promise.all([
        api.getPolicySettings(),
        api.getSchedulerStatus(),
        api.getSites(),
      ]);
      setPolicy(policyData);
      setScheduler(schedulerData);
      setSites(siteData);
      setSiteDrafts(Object.fromEntries(siteData.map((st) => [st.siteId, { lat: st.geo ? String(st.geo.lat) : '', lng: st.geo ? String(st.geo.lng) : '', radiusM: st.geo ? String(st.geo.radiusM) : '' }])));
    } catch (err) {
      setPageError(errorMessage(err, 'Failed to load settings'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadPayrollRunData = async (month: string) => {
    setIsPayrollLoading(true);
    setPayrollActionError(null);
    try {
      const [status, history] = await Promise.all([
        api.getPayrollRunStatus(month),
        api.listPayrollRuns(),
      ]);
      setPayrollRunStatus(status);
      setPayrollRunHistory(history);
    } catch (err) {
      setPayrollActionError(errorMessage(err, 'Failed to load payroll run status'));
    } finally {
      setIsPayrollLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'payroll') {
      loadPayrollRunData(payrollMonth);
    }
  }, [activeTab, payrollMonth]);

  const handleConfirmedClose = async () => {
    setIsPayrollReviewOpen(false);
    await loadPayrollRunData(payrollMonth);
  };

  const handleReopenPayroll = async () => {
    const reason = window.prompt(
      `Reopen ${payrollMonth} payroll?\n\nThe month goes back to live calculation until you close it again. Every earlier snapshot stays in the history.\n\nEnter the reason (required):`
    );
    if (!reason || reason.trim().length < 5) return;

    setIsPayrollActionBusy(true);
    setPayrollActionError(null);
    try {
      await api.reopenPayrollMonth(payrollMonth, reason.trim());
      await loadPayrollRunData(payrollMonth);
    } catch (err) {
      setPayrollActionError(errorMessage(err, 'Failed to reopen payroll month'));
    } finally {
      setIsPayrollActionBusy(false);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policy) return;
    setIsSaving(true);
    try {
      const payload: PolicyUpdate = {
        shift: policy.shift, overtime: policy.overtime, offDayWork: policy.offDayWork, leaves: policy.leaves,
        weeklyOffDays: policy.weeklyOffDays, scheduler: policy.scheduler, ess: policy.ess,
      };
      const updated = await api.updatePolicySettings(payload);
      setPolicy(updated);
      setPageError(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setPageError(errorMessage(err, 'Failed to update policy'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName) return;
    try {
      await api.addHoliday({
        date: newHolidayDate,
        name: newHolidayName,
        type: newHolidayType,
        paid: newHolidayPaid,
      });
      setNewHolidayDate('');
      setNewHolidayName('');
      setPageError(null);
      loadSettingsData();
    } catch (err) {
      setPageError(errorMessage(err, 'Failed to add holiday'));
    }
  };

  const handleRemoveHoliday = async (id: string) => {
    try {
      await api.removeHoliday(id);
      setPageError(null);
      loadSettingsData();
    } catch (err) {
      setPageError(errorMessage(err, 'Failed to delete holiday'));
    }
  };

  const handleToggleScheduler = async () => {
    try {
      const updated = await api.toggleScheduler();
      setScheduler(updated);
    } catch (err) {
      setPageError(errorMessage(err, 'Failed to toggle the scheduler'));
    }
  };

  const handleTriggerNow = async () => {
    try {
      await api.triggerSchedulerNow();
      loadSettingsData();
    } catch (err) {
      setPageError(errorMessage(err, 'Immediate sync failed'));
    }
  };

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-brand-500" />
            <span>HRMS Policies & System Configuration</span>
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Shift timing rules, late grace periods, company holidays, and background auto-sync scheduler
          </p>
        </div>

        {/* Global Save Alert */}
        {saveSuccess && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-bold animate-in fade-in">
            <Check className="w-4 h-4" />
            Settings saved successfully!
          </span>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('policy')}
          className={`px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all flex items-center gap-2 ${
            activeTab === 'policy'
              ? 'bg-white text-brand-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Shift & Grace Rules</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('holidays')}
          className={`px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all flex items-center gap-2 ${
            activeTab === 'holidays'
              ? 'bg-white text-brand-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Holidays & Weekly Offs ({policy?.holidays?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scheduler')}
          className={`px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all flex items-center gap-2 ${
            activeTab === 'scheduler'
              ? 'bg-white text-brand-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Auto-Sync Scheduler</span>
          {scheduler?.isRunning && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sources')}
          className={`px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all flex items-center gap-2 ${
            activeTab === 'sources'
              ? 'bg-white text-brand-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Biometric Hardware ({sources.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all flex items-center gap-2 ${
            activeTab === 'payroll'
              ? 'bg-white text-brand-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Payroll Closing</span>
        </button>
      </div>

      {/* TAB 1: SHIFTS & GRACE RULES */}
      {activeTab === 'policy' && policy && (
        <form onSubmit={handleSavePolicy} className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-card space-y-5">
            <div>
              <h3 className="text-sm font-heading font-bold text-slate-900">Shift Timing & Attendance Thresholds</h3>
              <p className="text-xs text-slate-500">Configure standard operating shift, grace window, and half-day limits</p>
              <p className="mt-2 text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
                These settings apply globally: to every employee and to every attendance, dashboard, timesheet, portal, report, export and payroll
                calculation from the moment you save (policy v{policy.version}). Months that are already closed keep the policy they were closed under.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">Shift Name</label>
                <input
                  type="text"
                  value={policy.shift.shiftName}
                  onChange={(e) => setPolicy({
                    ...policy,
                    shift: { ...policy.shift, shiftName: e.target.value }
                  })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">Grace Period (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={policy.shift.gracePeriodMinutes}
                  onChange={(e) => setPolicy({
                    ...policy,
                    shift: { ...policy.shift, gracePeriodMinutes: Number(e.target.value) }
                  })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Punches after {policy.derived?.lateAfter ?? '—'} (shift start + grace) are flagged as Late In
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">Shift Start Time</label>
                <input
                  type="time"
                  value={policy.shift.startTime}
                  onChange={(e) => setPolicy({
                    ...policy,
                    shift: { ...policy.shift, startTime: e.target.value }
                  })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">Shift End Time</label>
                <input
                  type="time"
                  value={policy.shift.endTime}
                  onChange={(e) => setPolicy({
                    ...policy,
                    shift: { ...policy.shift, endTime: e.target.value }
                  })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">Early Checkout Full-Day Cutoff</label>
                <input
                  type="time"
                  value={policy.shift.minCheckoutForFullDay || ''}
                  onChange={(e) => setPolicy({
                    ...policy,
                    shift: { ...policy.shift, minCheckoutForFullDay: e.target.value }
                  })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">{policy.shift.minCheckoutForFullDay ? `Checkout at or after ${policy.shift.minCheckoutForFullDay} (with at least the half-day hours) is credited as a full day` : 'Not set: only the full-day hours threshold applies'}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">Half-Day Threshold (Minutes)</label>
                <input
                  type="number"
                  min="60"
                  max="480"
                  step="30"
                  value={policy.shift.halfDayThresholdMinutes}
                  onChange={(e) => setPolicy({
                    ...policy,
                    shift: { ...policy.shift, halfDayThresholdMinutes: Number(e.target.value) }
                  })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Working &lt; {policy.shift.halfDayThresholdMinutes / 60}h is Absent; &ge; {policy.shift.halfDayThresholdMinutes / 60}h is Half-Day (P/2)</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">Full-Day Threshold (Minutes)</label>
                <input
                  type="number"
                  min="240"
                  max="600"
                  step="30"
                  value={policy.shift.fullDayThresholdMinutes}
                  onChange={(e) => setPolicy({
                    ...policy,
                    shift: { ...policy.shift, fullDayThresholdMinutes: Number(e.target.value) }
                  })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Working {policy.shift.fullDayThresholdMinutes / 60}+ hours marks Full Present (P)</span>
              </div>
            </div>
          </div>

          {/* Overtime Policy */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-card space-y-4">
            <div className="space-y-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-heading font-bold text-slate-900">Weekly Off Days</h3>
                <p className="text-xs text-slate-500">Used by attendance, payroll, leave and every calendar. Nothing else decides which days are off.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {DAY_NAMES.map((day: DayName) => {
                  const on = policy.weeklyOffDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setPolicy({ ...policy, weeklyOffDays: on ? policy.weeklyOffDays.filter((d) => d !== day) : [...policy.weeklyOffDays, day] })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${on ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                      {day.charAt(0) + day.slice(1, 3).toLowerCase()}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-700 font-heading">Web punch location check</label>
                <select
                  value={policy.ess.geofenceMode}
                  onChange={(e) => setPolicy({ ...policy, ess: { geofenceMode: e.target.value as 'ENFORCE' | 'OFF' } })}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                >
                  <option value="ENFORCE">Enforce site geofence</option>
                  <option value="OFF">Off</option>
                </select>
                <span className="text-[10px] text-slate-400">Enforced only for sites that have a location configured (Sources tab).</span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-heading font-bold text-slate-900">Work on Weekly Off / Paid Holiday</h3>
              <p className="text-xs text-slate-500">One rule, used by attendance, timesheet, portal and payroll</p>
            </div>
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['weeklyOff', 'paidHoliday'] as const).map((kind) => (
                  <div key={kind}>
                    <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">
                      {kind === 'weeklyOff' ? 'Work on a weekly off' : 'Work on a paid holiday'}
                    </label>
                    <select
                      value={policy.offDayWork?.[kind]?.recognition ?? 'MANUAL'}
                      onChange={(e) => setPolicy({
                        ...policy,
                        offDayWork: { ...policy.offDayWork, [kind]: { recognition: e.target.value as 'MANUAL' | 'AUTOMATIC' } },
                      })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                    >
                      <option value="MANUAL">Manual: HR enters the days in the OT calculator</option>
                      <option value="AUTOMATIC">Automatic: recognized from punches and paid</option>
                    </select>
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Automatic uses the half-day / full-day thresholds above (full day = 1, half day = 0.5) and the existing off-day pay rate.
              </span>
            </div>

            <div>
              <h3 className="text-sm font-heading font-bold text-slate-900">Overtime (OT) Policy</h3>
              <p className="text-xs text-slate-500">Auto-calculate overtime hours for payroll processing</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="otEnabled"
                  checked={policy.overtime.enabled}
                  onChange={(e) => setPolicy({
                    ...policy,
                    overtime: { ...policy.overtime, enabled: e.target.checked }
                  })}
                  className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
                />
                <label htmlFor="otEnabled" className="text-xs font-bold text-slate-800 font-heading cursor-pointer">
                  Enable Overtime Calculation
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">Overtime Starts After (Hours)</label>
                <div className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                  {(() => {
                    if (policy.derived?.standardDayHours) return `${policy.derived.standardDayHours}h`;
                    const s = policy.shift?.startTime || '09:00';
                    const e = policy.shift?.endTime || '17:30';
                    const [sh, sm] = s.split(':').map(Number);
                    const [eh, em] = e.split(':').map(Number);
                    const startMin = (sh || 0) * 60 + (sm || 0);
                    let endMin = (eh || 0) * 60 + (em || 0);
                    if (endMin < startMin) endMin += 1440;
                    const hrs = Math.round(((endMin - startMin) / 60) * 10) / 10;
                    return `${hrs}h`;
                  })()}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Auto-calculated from Shift Start/End time above ({policy.shift.startTime}&ndash;{policy.shift.endTime}) &mdash; change the shift timing to adjust this.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">OT Standard Hours per Day</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  value={policy.overtime.hoursPerDay ?? 8}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setPolicy({
                      ...policy,
                      overtime: { ...policy.overtime, hoursPerDay: !isNaN(val) && val > 0 ? val : 8 }
                    });
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-brand-500 outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Global. OT hourly rate = (Basic + DA) / 26 / this value (default 8).
                </span>
              </div>
            </div>
          </div>

          {/* Annual Leave Entitlements & Policy (SuperAdmin Controls) */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-heading font-bold text-slate-900 flex items-center gap-2">
                  <span>Annual Leave Entitlements & Quotas</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    SuperAdmin Control
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Configure company annual leave quotas for all employees. Balances update dynamically in Employee Self-Service.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">
                  Casual Leave (CL) Quota
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={policy.leaves?.casualLeave ?? 12}
                  onChange={(e) => setPolicy({
                    ...policy,
                    leaves: {
                      casualLeave: Number(e.target.value),
                      sickLeave: policy.leaves?.sickLeave ?? 12,
                      earnedLeave: policy.leaves?.earnedLeave ?? 15,
                      compOff: policy.leaves?.compOff ?? 2,
                    }
                  })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Annual days granted per employee</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">
                  Sick Leave (SL) Quota
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={policy.leaves?.sickLeave ?? 12}
                  onChange={(e) => setPolicy({
                    ...policy,
                    leaves: {
                      casualLeave: policy.leaves?.casualLeave ?? 12,
                      sickLeave: Number(e.target.value),
                      earnedLeave: policy.leaves?.earnedLeave ?? 15,
                      compOff: policy.leaves?.compOff ?? 2,
                    }
                  })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Annual medical/sick leave entitlement</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">
                  Earned Leave (EL) Quota
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={policy.leaves?.earnedLeave ?? 15}
                  onChange={(e) => setPolicy({
                    ...policy,
                    leaves: {
                      casualLeave: policy.leaves?.casualLeave ?? 12,
                      sickLeave: policy.leaves?.sickLeave ?? 12,
                      earnedLeave: Number(e.target.value),
                      compOff: policy.leaves?.compOff ?? 2,
                    }
                  })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Paid privilege/annual leaves</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-gradient-to-r from-brand-500 to-brand-base hover:opacity-95 text-white text-xs font-heading font-bold rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Shift Policies'}</span>
            </button>
          </div>
        </form>
      )}

      {pageError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
          <span>{pageError}</span>
          <button type="button" onClick={() => setPageError(null)} className="text-rose-500 font-bold">Dismiss</button>
        </div>
      )}

      {/* TAB 2: HOLIDAYS & WEEKLY OFFS */}
      {activeTab === 'holidays' && policy && (
        <div className="space-y-6">
          {/* Add Holiday Form */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-card space-y-4">
            <div>
              <h3 className="text-sm font-heading font-bold text-slate-900">Add Company Holiday</h3>
              <p className="text-xs text-slate-500">A paid holiday is a company day-off for everyone. Untick it for an optional holiday that is a normal working day.</p>
            </div>

            <form onSubmit={handleAddHoliday} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">Holiday Date</label>
                <input
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">Holiday Name</label>
                <input
                  type="text"
                  placeholder="e.g. Diwali, Independence Day"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                  <input type="checkbox" checked={newHolidayPaid} onChange={(e) => setNewHolidayPaid(e.target.checked)} /> Company day-off (paid)
                </label>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-heading font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Holiday</span>
                </button>
              </div>
            </form>
          </div>

          {/* Holiday List */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-card space-y-4">
            <h3 className="text-sm font-heading font-bold text-slate-900">Company Holidays Calendar</h3>
            <div className="divide-y divide-slate-100">
              {policy.holidays.map((hol) => (
                <div key={hol.id} className="py-3 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-brand-600 border border-sky-200 flex flex-col items-center justify-center text-[10px] font-bold">
                      <span>{formatBusinessDate(hol.date).split(' ')[1]}</span>
                      <span className="text-xs font-extrabold text-slate-900">{hol.date.slice(8, 10)}</span>
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-slate-900 text-xs">{hol.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">{formatBusinessDate(hol.date)} • {hol.type} • {hol.paid ? 'paid day-off' : 'working day (optional)'}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveHoliday(hol.id)}
                    className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    title="Delete Holiday"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUTO-SYNC SCHEDULER */}
      {activeTab === 'scheduler' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-card space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-heading font-bold text-slate-900">Automated Background Sync Scheduler</h3>
                <p className="text-xs text-slate-500">Periodically fetches punches from all 3 biometric machines quietly in the background</p>
              </div>

              <span className={`text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                scheduler?.isRunning
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${scheduler?.isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {scheduler?.isRunning ? 'Scheduler Active' : 'Scheduler Paused'}
              </span>
            </div>

            {/* Scheduler Status Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Frequency</span>
                <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
                  Every {scheduler?.intervalMinutes || 5} Minutes
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Auto-Cycles</span>
                <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
                  {scheduler?.totalRuns || 0} Executed
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Last Sync Run</span>
                <span className="text-xs font-bold text-slate-700 block mt-1 truncate">
                  {scheduler?.lastRunAt ? new Date(scheduler.lastRunAt).toLocaleTimeString() : 'Running...'}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Next Sync In</span>
                <span className="text-xs font-bold text-emerald-600 block mt-1 truncate">
                  {scheduler?.nextRunAt ? new Date(scheduler.nextRunAt).toLocaleTimeString() : 'Scheduled'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleToggleScheduler}
                className={`px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all flex items-center gap-2 shadow-xs ${
                  scheduler?.isRunning
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {scheduler?.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{scheduler?.isRunning ? 'Pause Auto-Sync' : 'Resume Auto-Sync'}</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerNow}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-heading font-bold rounded-xl shadow-xs transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Trigger Immediate Sync Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BIOMETRIC HARDWARE SOURCES */}
      {activeTab === 'sources' && (
        <div className="space-y-6">
          {/* Security Notice */}
          <div className="p-5 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-slate-700 space-y-2 shadow-xs">
            <div className="flex items-center gap-2 font-heading font-bold text-brand-700 text-sm">
              <ShieldCheck className="w-5 h-5 text-brand-600" />
              <span>Security & Credential Isolation Architecture</span>
            </div>
            <p className="leading-relaxed text-slate-600 text-xs font-sans">
              In accordance with security standards, all Corporate IDs, Usernames, and Passwords are
              stored strictly in server-side environment variables (<code className="bg-white px-1.5 py-0.5 rounded border border-sky-200 text-brand-700 font-mono font-bold">.env</code>).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sources.map((src) => (
              <div
                key={src.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-card"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-heading font-bold text-slate-900 text-sm">{src.name}</h4>
                    <p className="text-[10px] text-slate-500 font-medium">ID: {src.id}</p>
                  </div>
                  <StatusBadge status={src.status} size="sm" />
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-2 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Raw punches:</span>
                    <span className="text-slate-900 font-bold">{src.lastRawSync ? `${src.lastRawSync.status} · ${formatInstantIst(src.lastRawSync.at)}` : 'never'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Daily IN/OUT:</span>
                    <span className="text-slate-900 font-bold">{src.lastInOutSync ? `${src.lastInOutSync.status} · ${formatInstantIst(src.lastInOutSync.at)}` : 'never'}</span>
                  </div>
                  {(src.lastRawSync?.error || src.lastInOutSync?.error) && (
                    <p className="text-rose-600 font-sans">{src.lastRawSync?.error || src.lastInOutSync?.error}</p>
                  )}
                </div>

                {(() => {
                  const draft = siteDrafts[src.siteId] ?? { lat: '', lng: '', radiusM: '' };
                  const setDraft = (patch: Partial<typeof draft>) => setSiteDrafts((d) => ({ ...d, [src.siteId]: { ...draft, ...patch } }));
                  return (
                    <div className="border-t border-slate-100 pt-3 space-y-2">
                      <div className="text-[11px] font-bold text-slate-700 font-heading">Punch location (geofence)</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <input placeholder="Latitude" value={draft.lat} onChange={(e) => setDraft({ lat: e.target.value })} className="px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-mono" />
                        <input placeholder="Longitude" value={draft.lng} onChange={(e) => setDraft({ lng: e.target.value })} className="px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-mono" />
                        <input placeholder="Radius m" value={draft.radiusM} onChange={(e) => setDraft({ radiusM: e.target.value })} className="px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-mono" />
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const empty = !draft.lat && !draft.lng && !draft.radiusM;
                            await api.updateSite(src.siteId, { geo: empty ? null : { lat: Number(draft.lat), lng: Number(draft.lng), radiusM: Number(draft.radiusM) } });
                            setPageError(null);
                            await loadSettingsData();
                          } catch (err) {
                            setPageError(errorMessage(err, 'Could not save the location'));
                          }
                        }}
                        className="w-full py-1.5 text-[11px] font-bold text-brand-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg"
                      >
                        Save location
                      </button>
                      <p className="text-[10px] text-slate-400 font-sans">{sites.find((st) => st.siteId === src.siteId)?.geo ? 'Web punches must be inside this circle.' : 'No location set: web punches for this site are not location-checked.'}</p>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: PAYROLL CLOSING */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-slate-700 space-y-2 shadow-xs">
            <div className="flex items-center gap-2 font-heading font-bold text-brand-700 text-sm">
              <Lock className="w-5 h-5 text-brand-600" />
              <span>Why close a month?</span>
            </div>
            <p className="leading-relaxed text-slate-600 text-xs font-sans">
              Payroll is normally calculated live from current attendance data. That's fine day-to-day, but it
              means numbers for a past month could still shift if attendance gets corrected after you've already
              paid salaries. Closing a month locks in a permanent record of exactly what was paid — it never
              changes again unless you explicitly reopen it.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-card space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">Month</label>
                <input
                  type="month"
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>
            </div>

            {payrollActionError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{payrollActionError}</span>
              </div>
            )}

            {isPayrollLoading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">Loading payroll status…</div>
            ) : payrollRunStatus ? (
              <div
                className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  payrollRunStatus.status === 'CLOSED'
                    ? 'bg-emerald-50 border-emerald-200'
                    : payrollRunStatus.status === 'REOPENED'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      payrollRunStatus.status === 'CLOSED'
                        ? 'bg-emerald-500 text-white'
                        : payrollRunStatus.status === 'REOPENED'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {payrollRunStatus.status === 'CLOSED' ? (
                      <Lock className="w-5 h-5" />
                    ) : (
                      <Unlock className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="font-heading font-bold text-sm text-slate-900">
                      {payrollMonth} — {payrollRunStatus.status === 'CLOSED' ? 'Closed & Locked' : payrollRunStatus.status === 'REOPENED' ? 'Reopened (live again)' : 'Open (live)'}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {payrollRunStatus.status === 'CLOSED' &&
                        `Locked (snapshot v${payrollRunStatus.currentVersion ?? 1}) by ${payrollRunStatus.closedBy} on ${formatInstantIst(payrollRunStatus.closedAt)} IST · ${payrollRunStatus.employeeCount} employees · ₹${(payrollRunStatus.totalNetPaid || 0).toLocaleString('en-IN')} total net pay`}
                      {payrollRunStatus.status === 'REOPENED' &&
                        `Reopened by ${payrollRunStatus.reopenedBy} on ${formatInstantIst(payrollRunStatus.reopenedAt)} IST${payrollRunStatus.reopenReason ? ` (${payrollRunStatus.reopenReason})` : ''}: recalculating live until closed again.`}
                      {payrollRunStatus.status === 'OPEN' &&
                        'Never closed — figures are calculated live from current attendance data.'}
                    </p>
                  </div>
                </div>

                {payrollRunStatus.status === 'CLOSED' ? (
                  !isSuperAdmin ? (
                    <span className="text-[11px] font-semibold text-amber-800 bg-white border border-amber-300 rounded-xl px-3 py-2 shrink-0">Only a Super Admin can reopen a closed month</span>
                  ) : (
                  <button
                    type="button"
                    onClick={handleReopenPayroll}
                    disabled={isPayrollActionBusy}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-amber-300 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-heading font-bold transition-all active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>{isPayrollActionBusy ? 'Reopening…' : `Reopen ${payrollMonth}`}</span>
                  </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsPayrollReviewOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-base hover:opacity-95 text-white rounded-xl text-xs font-heading font-bold shadow-md shadow-brand-500/20 transition-all active:scale-95 shrink-0"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Review &amp; Close {payrollMonth}</span>
                  </button>
                )}
              </div>
            ) : null}
          </div>

          {/* History */}
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-card overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/80">
              <h3 className="font-heading font-bold text-sm text-slate-900">Payroll Close History</h3>
              <p className="text-[11px] text-slate-500">Every month that's been closed, with who closed it and when</p>
            </div>
            {payrollRunHistory.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-medium">No months closed yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Month</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Closed By</th>
                      <th className="py-3 px-4">Closed At</th>
                      <th className="py-3 px-4 text-right">Employees</th>
                      <th className="py-3 px-4 text-right">Total Net Pay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {payrollRunHistory.map((run) => (
                      <tr key={run.month} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-bold text-slate-900">{run.month}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={run.status === 'CLOSED' ? 'success' : run.status === 'REOPENED' ? 'partial' : 'ready'} size="sm" />
                        </td>
                        <td className="py-3 px-4">{run.closedBy || '—'}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {run.closedAt ? new Date(run.closedAt).toLocaleString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">{run.employeeCount ?? '—'}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-brand-600">
                          {run.totalNetPaid !== undefined ? `₹${run.totalNetPaid.toLocaleString('en-IN')}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <PayrollCloseReviewModal
        month={payrollMonth}
        isOpen={isPayrollReviewOpen}
        onClose={() => setIsPayrollReviewOpen(false)}
        onConfirmed={handleConfirmedClose}
      />
    </div>
  );
};
