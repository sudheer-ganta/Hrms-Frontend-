import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Clock,
  RefreshCw,
  Building2,
  Save,
  Plus,
  Trash2,
  Play,
  Pause,
  CalendarDays,
  Check,
  Lock,
  Unlock,
  AlertTriangle,
  BookOpen
} from 'lucide-react';
import { api } from '../services/api';
import { AttendanceSource, HRMSPolicySettings, SchedulerStatus, SyncWindow, PayrollRunStatus, PolicyUpdate, DAY_NAMES, DayName, Site } from '../types';
import { errorMessage } from '../lib/apiError';
import { useDataVersion, useLastUpdatedTime } from '../services/dataSync';
import { istMonth, formatBusinessDate, formatInstantIst } from '../lib/businessDate';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { PayrollCloseReviewModal } from '../components/settings/PayrollCloseReviewModal';
import { ShiftFields } from '../components/settings/ShiftEditor';
import { RulesTab } from '../components/settings/RulesTab';

interface SettingsPageProps {
  sources: AttendanceSource[];
}

const currentMonthKey = () => istMonth();

export const Settings: React.FC<SettingsPageProps> = ({ sources }) => {
  const { isSuperAdmin } = useAuth();
  const dataVersion = useDataVersion();
  const lastUpdated = useLastUpdatedTime();
  const [pageError, setPageError] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [siteDrafts, setSiteDrafts] = useState<Record<string, { lat: string; lng: string; radiusM: string }>>({});
  const [newHolidayPaid, setNewHolidayPaid] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'policy' | 'holidays' | 'scheduler' | 'sources' | 'payroll' | 'rules'>('policy');
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
      setPageError(errorMessage(err, 'Could not load settings.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isSaving) {
      loadSettingsData();
    }
  }, [dataVersion]);

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
        shift: policy.shift, shifts: policy.shifts, overtime: policy.overtime, offDayWork: policy.offDayWork, leaves: policy.leaves,
        weeklyOffDays: policy.weeklyOffDays, scheduler: policy.scheduler, ess: policy.ess, ...(policy.statutory?.pf ? { statutory: policy.statutory } : {}),
      };
      const updated = await api.updatePolicySettings(payload);
      setPolicy(updated);
      setPageError(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setPageError(errorMessage(err, 'Could not save. Please try again.'));
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
      setPageError(errorMessage(err, 'Could not add the holiday.'));
    }
  };

  const handleRemoveHoliday = async (id: string) => {
    try {
      await api.removeHoliday(id);
      setPageError(null);
      loadSettingsData();
    } catch (err) {
      setPageError(errorMessage(err, 'Could not remove the holiday.'));
    }
  };

  const handleToggleScheduler = async () => {
    try {
      const updated = await api.toggleScheduler();
      setScheduler(updated);
    } catch (err) {
      setPageError(errorMessage(err, 'Could not change the automatic update.'));
    }
  };

  // Editable copy of the update times; saved with "Save update times".
  const [windowDrafts, setWindowDrafts] = useState<SyncWindow[]>([]);
  const [windowsSaving, setWindowsSaving] = useState(false);
  useEffect(() => { setWindowDrafts((scheduler?.windows ?? []).map((w) => ({ ...w }))); }, [scheduler?.windows]);
  const windowsChanged = JSON.stringify(windowDrafts) !== JSON.stringify(scheduler?.windows ?? []);
  const setWindowField = (i: number, patch: Partial<SyncWindow>) => setWindowDrafts((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const handleSaveWindows = async () => {
    setWindowsSaving(true);
    try {
      await api.updatePolicySettings({ scheduler: { enabled: policy?.scheduler.enabled ?? true, intervalMinutes: policy?.scheduler.intervalMinutes ?? 5, windows: windowDrafts } });
      setScheduler(await api.getSchedulerStatus());
      setPageError(null);
    } catch (err) {
      setPageError(errorMessage(err, 'Could not save the update times.'));
    } finally {
      setWindowsSaving(false);
    }
  };

  const handleTriggerNow = async () => {
    try {
      await api.triggerSchedulerNow();
      loadSettingsData();
    } catch (err) {
      setPageError(errorMessage(err, 'Could not update attendance now.'));
    }
  };

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-brand-500" />
            <span>Settings</span>
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Work hours, holidays, leave, PF and when the machines update
          </p>
        </div>

        {/* Global Save Alert */}
        {saveSuccess && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-bold animate-in fade-in">
            <Check className="w-4 h-4" />
            Saved!
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
          <span>Work hours & pay rules</span>
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
          <span>Holidays ({policy?.holidays?.length || 0})</span>
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
          <span>Auto update</span>
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
          <span>Machines ({sources.length})</span>
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
          <span>Lock salary</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all flex items-center gap-2 ${
            activeTab === 'rules'
              ? 'bg-white text-brand-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Company rules</span>
        </button>
      </div>

      {/* TAB 1: SHIFTS & GRACE RULES */}
      {activeTab === 'policy' && policy && (
        <form onSubmit={handleSavePolicy} className="space-y-6">
          {/* Shifts */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-heading font-bold text-slate-900">Work hours</h3>
                <p className="text-xs text-slate-500">
                  A shift is the time people work, plus the hours that count as overtime. Everyone follows the first shift unless you choose another one in their details.
                  Overtime is paid only to people who have overtime switched on (Employees page).
                </p>
                <p className="text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
                  When you save, every screen and every salary uses the new rules straight away. Months that are already locked keep the rules they had.
                </p>
              </div>
              <button
                type="button"
                disabled={policy.shifts.length >= 10}
                onClick={() => setPolicy({
                  ...policy,
                  shifts: [...policy.shifts, { ...policy.shift, shiftName: `Shift ${policy.shifts.length + 1}`, otWindows: [] }],
                })}
                className="shrink-0 self-start inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40"
              >
                <Plus className="w-4 h-4" /> Add another shift
              </button>
            </div>

            <ShiftFields
              isDefault
              shift={policy.shift}
              lateAfter={policy.derived?.lateAfter}
              onChange={(next) => setPolicy({ ...policy, shift: next })}
            />
            {policy.shifts.map((s, i) => (
              <ShiftFields
                key={i}
                shift={s}
                onChange={(next) => setPolicy({ ...policy, shifts: policy.shifts.map((x, j) => (j === i ? next : x)) })}
                onRemove={() => setPolicy({ ...policy, shifts: policy.shifts.filter((_, j) => j !== i) })}
              />
            ))}
          </div>

          {/* Overtime Policy */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-card space-y-4">
            <div className="space-y-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-heading font-bold text-slate-900">Weekly off days</h3>
                <p className="text-xs text-slate-500">Tap the days the company is closed every week. Everything in the system follows this.</p>
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
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <label className="text-xs font-bold text-slate-700 font-heading">Check location when punching from the website</label>
                <select
                  value={policy.ess.geofenceMode}
                  onChange={(e) => setPolicy({ ...policy, ess: { geofenceMode: e.target.value as 'ENFORCE' | 'OFF' } })}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                >
                  <option value="ENFORCE">Yes, must be at the office</option>
                  <option value="OFF">No, allow from anywhere</option>
                </select>
                <span className="text-[10px] text-slate-400">Works only for places where you have set the office location (Machines tab).</span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-heading font-bold text-slate-900">Working on an off day or a paid holiday</h3>
              <p className="text-xs text-slate-500">What should happen when someone comes to work on a day off</p>
            </div>
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['weeklyOff', 'paidHoliday'] as const).map((kind) => (
                  <div key={kind}>
                    <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">
                      {kind === 'weeklyOff' ? 'Working on a weekly off' : 'Working on a paid holiday'}
                    </label>
                    <select
                      value={policy.offDayWork?.[kind]?.recognition ?? 'MANUAL'}
                      onChange={(e) => setPolicy({
                        ...policy,
                        offDayWork: { ...policy.offDayWork, [kind]: { recognition: e.target.value as 'MANUAL' | 'AUTOMATIC' } },
                      })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                    >
                      <option value="MANUAL">I will type the days myself (Overtime Pay screen)</option>
                      <option value="AUTOMATIC">Automatic: counted from punches and paid</option>
                    </select>
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Automatic uses the half-day and full-day limits above (full day counts 1, half day counts 0.5) and the usual off-day pay.
              </span>
            </div>

            <div>
              <h3 className="text-sm font-heading font-bold text-slate-900">Overtime pay</h3>
              <p className="text-xs text-slate-500">
                Overtime is the time a person stays inside the overtime hours you set above, for people who have overtime switched on.
                It is added up every month and paid automatically. You can still change a person&apos;s hours on the Overtime Pay screen.
              </p>
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
                  Pay overtime
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">Working hours in one day (used for the overtime rate)</label>
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
                  Overtime for one hour = (Basic + DA) ÷ 26 days ÷ this number, times the overtime multiplier. Usually 8.
                </span>
              </div>
            </div>
          </div>

          {/* Annual Leave Entitlements & Policy (SuperAdmin Controls) */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-heading font-bold text-slate-900 flex items-center gap-2">
                  <span>Leave days per year</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Admin only
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  How many leave days each person gets in a year. Each person sees their balance in their own login.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">
                  Casual leave
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
                <span className="text-[10px] text-slate-400 mt-1 block">Days per year for each person</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">
                  Sick leave
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
                <span className="text-[10px] text-slate-400 mt-1 block">Days per year for illness</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">
                  Earned leave
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
                <span className="text-[10px] text-slate-400 mt-1 block">Paid leave days per year</span>
              </div>
            </div>
          </div>

          {/* Provident Fund rules: change here when the law changes */}
          {policy.statutory?.pf && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-card space-y-4">
            <div>
              <h3 className="text-sm font-heading font-bold text-slate-900 flex items-center gap-2">
                <span>PF rules</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Admin only
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Change these only when the government changes PF rules. Every PF amount on salary and on the PF page follows them.
                A change applies to months that are not locked yet.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {([
                { key: 'employeeRatePct', label: 'PF cut from the employee (%)', hint: 'The company adds the same amount', max: 100 },
                { key: 'epsRatePct', label: 'Company share for pension (%)', hint: 'Part of the company share that goes to pension; the rest goes to PF', max: 100 },
                { key: 'adminRatePct', label: 'PF office charge (%)', hint: 'Paid by the company', max: 10 },
                { key: 'edliRatePct', label: 'Insurance (EDLI) (%)', hint: 'Paid by the company', max: 10 },
              ] as const).map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">{f.label}</label>
                  <input
                    type="number"
                    min="0"
                    max={f.max}
                    step="0.01"
                    value={policy.statutory.pf[f.key]}
                    onChange={(e) => setPolicy({
                      ...policy,
                      statutory: { pf: { ...policy.statutory.pf, [f.key]: e.target.value === '' ? 0 : Number(e.target.value) } },
                    })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">{f.hint}</span>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">PF salary limit (PF is cut only up to this much salary)</label>
              <div className="space-y-2">
                {policy.statutory.pf.ceilings.map((row, idx) => {
                  const setRow = (patch: Partial<typeof row>) => setPolicy({
                    ...policy,
                    statutory: { pf: { ...policy.statutory.pf, ceilings: policy.statutory.pf.ceilings.map((r, i) => (i === idx ? { ...r, ...patch } : r)) } },
                  });
                  return (
                    <div key={idx} className="flex flex-wrap items-center gap-3">
                      {idx === 0 ? (
                        <span className="w-40 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-500">From the start</span>
                      ) : (
                        <input
                          type="date"
                          value={row.from}
                          onChange={(e) => setRow({ from: e.target.value })}
                          className="w-40 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                        />
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-500">₹</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={row.ceiling}
                          onChange={(e) => setRow({ ceiling: e.target.value === '' ? 0 : Number(e.target.value) })}
                          className="w-32 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                        />
                      </div>
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => setPolicy({ ...policy, statutory: { pf: { ...policy.statutory.pf, ceilings: policy.statutory.pf.ceilings.filter((_, i) => i !== idx) } } })}
                          className="p-2 rounded-lg text-rose-500 hover:bg-rose-50"
                          aria-label="Remove this ceiling"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setPolicy({
                  ...policy,
                  statutory: { pf: { ...policy.statutory.pf, ceilings: [...policy.statutory.pf.ceilings, { from: '', ceiling: policy.statutory.pf.ceilings[policy.statutory.pf.ceilings.length - 1]?.ceiling ?? 15000 }] } },
                })}
                className="mt-3 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add a new limit from a date</span>
              </button>
              <span className="text-[10px] text-slate-400 mt-2 block">
                A new limit counts from its date. If the date is in the middle of a month, that month is split into two parts by days.
              </span>
            </div>
          </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-gradient-to-r from-brand-500 to-brand-base hover:opacity-95 text-white text-xs font-heading font-bold rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
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
              <h3 className="text-sm font-heading font-bold text-slate-900">Add a holiday</h3>
              <p className="text-xs text-slate-500">A paid holiday means the company is closed and everyone is paid. Untick the box if it is optional and people work as normal.</p>
            </div>

            <form onSubmit={handleAddHoliday} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">Date</label>
                <input
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">Name</label>
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
                  <input type="checkbox" checked={newHolidayPaid} onChange={(e) => setNewHolidayPaid(e.target.checked)} /> Company is closed (paid)
                </label>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-heading font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>
            </form>
          </div>

          {/* Holiday List */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-card space-y-4">
            <h3 className="text-sm font-heading font-bold text-slate-900">All holidays</h3>
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
                      <p className="text-[10px] text-slate-400 font-mono">{formatBusinessDate(hol.date)} • {hol.type === 'NATIONAL' ? 'National' : hol.type === 'FESTIVAL' ? 'Festival' : 'Optional'} • {hol.paid ? 'company closed (paid)' : 'normal working day (optional)'}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveHoliday(hol.id)}
                    className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    title="Remove this holiday"
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
                <h3 className="text-sm font-heading font-bold text-slate-900">Automatic attendance update</h3>
                <p className="text-xs text-slate-500">The system collects punches from all the attendance machines by itself, so you do not have to</p>
              </div>

              <span className={`text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                scheduler?.isRunning
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${scheduler?.isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {scheduler?.isRunning ? 'Working' : 'Stopped'}
              </span>
            </div>

            {/* Scheduler Status Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">How often</span>
                {scheduler?.windows?.length ? (
                  <span className="text-xs font-extrabold text-slate-900 block mt-1">Only at the times below</span>
                ) : (
                  <span className="text-sm font-extrabold text-slate-900 block mt-0.5">Every {scheduler?.intervalMinutes || 5} minutes</span>
                )}
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Times done so far</span>
                <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
                  {scheduler?.totalRuns || 0} times
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Last updated</span>
                <span className="text-xs font-bold text-slate-700 block mt-1 truncate">
                  {scheduler?.lastRunAt ? new Date(scheduler.lastRunAt).toLocaleTimeString() : 'Running...'}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Next update</span>
                <span className="text-xs font-bold text-emerald-600 block mt-1 truncate">
                  {scheduler?.nextRunAt ? new Date(scheduler.nextRunAt).toLocaleTimeString() : 'Scheduled'}
                </span>
              </div>
            </div>

            {/* When the update runs */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <div>
                <h4 className="text-xs font-heading font-bold text-slate-900">When it updates</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  The update happens once on the server for everyone. Logging in or opening a page never collects punches. Between these times nothing is collected. Times are Indian time (IST).
                </p>
              </div>
              {windowDrafts.length === 0 && (
                <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  No times set, so the system collects every {scheduler?.intervalMinutes || 5} minutes, all day. Add a time window to reduce this.
                </p>
              )}
              <div className="space-y-2">
                {windowDrafts.map((w, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-500 font-semibold">From</span>
                    <input type="time" value={w.from} onChange={(e) => setWindowField(i, { from: e.target.value })} className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold" />
                    <span className="text-slate-500 font-semibold">to</span>
                    <input type="time" value={w.to} onChange={(e) => setWindowField(i, { to: e.target.value })} className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold" />
                    <span className="text-slate-500 font-semibold">every</span>
                    <select value={w.everyMinutes} onChange={(e) => setWindowField(i, { everyMinutes: Number(e.target.value) })} className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold">
                      {[...new Set([5, 10, 15, 30, 60, 120, 180, w.everyMinutes])].sort((a, b) => a - b).map((m) => (
                        <option key={m} value={m}>{m < 60 ? `${m} minutes` : m === 60 ? '1 hour' : m % 60 === 0 ? `${m / 60} hours` : `${m} minutes`}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setWindowDrafts((rows) => rows.filter((_, idx) => idx !== i))} className="px-2 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold">Remove</button>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">A time that ends earlier than it starts (for example 7 PM to 9 AM) runs through the night.</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setWindowDrafts((rows) => [...rows, { from: '09:00', to: '10:30', everyMinutes: 30 }])} disabled={windowDrafts.length >= 8} className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-40">Add a time</button>
                <button type="button" onClick={handleSaveWindows} disabled={!windowsChanged || windowsSaving} className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold disabled:opacity-40">{windowsSaving ? 'Saving...' : 'Save update times'}</button>
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
                <span>{scheduler?.isRunning ? 'Stop automatic update' : 'Start automatic update'}</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerNow}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-heading font-bold rounded-xl shadow-xs transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Update attendance now</span>
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
              <span>Machine passwords are kept safe</span>
            </div>
            <p className="leading-relaxed text-slate-600 text-xs font-sans">
              The logins for the attendance machines are never shown on this screen. They are kept safely on the server (in the file <code className="bg-white px-1.5 py-0.5 rounded border border-sky-200 text-brand-700 font-mono font-bold">.env</code>).
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
                    <span className="text-slate-500">Every punch:</span>
                    <span className="text-slate-900 font-bold">{src.lastRawSync ? `${src.lastRawSync.status} · ${formatInstantIst(src.lastRawSync.at)}` : 'never'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Day summary:</span>
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
                      <div className="text-[11px] font-bold text-slate-700 font-heading">Office location for website punching</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <input placeholder="Latitude" value={draft.lat} onChange={(e) => setDraft({ lat: e.target.value })} className="px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-mono" />
                        <input placeholder="Longitude" value={draft.lng} onChange={(e) => setDraft({ lng: e.target.value })} className="px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-mono" />
                        <input placeholder="Distance (metres)" value={draft.radiusM} onChange={(e) => setDraft({ radiusM: e.target.value })} className="px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-mono" />
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
                      <p className="text-[10px] text-slate-400 font-sans">{sites.find((st) => st.siteId === src.siteId)?.geo ? 'People must be within this distance of the office to punch from the website.' : 'No location set, so website punches are not checked for this place.'}</p>
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
              <span>Why lock a month?</span>
            </div>
            <p className="leading-relaxed text-slate-600 text-xs font-sans">
              Until you lock a month, salaries follow the attendance and can still change if attendance is corrected.
              Locking keeps a permanent copy of exactly what was paid. It never changes again unless an admin opens
              the month again. The easy way to do this is the Pay Salary page in the menu.
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
              <div className="p-8 text-center text-xs text-slate-400 font-medium">Loading…</div>
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
                      {payrollMonth} — {payrollRunStatus.status === 'CLOSED' ? 'Locked' : payrollRunStatus.status === 'REOPENED' ? 'Opened again (can change)' : 'Not locked (can change)'}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {payrollRunStatus.status === 'CLOSED' &&
                        `Locked (snapshot v${payrollRunStatus.currentVersion ?? 1}) by ${payrollRunStatus.closedBy} on ${formatInstantIst(payrollRunStatus.closedAt)} IST · ${payrollRunStatus.employeeCount} employees · ₹${(payrollRunStatus.totalNetPaid || 0).toLocaleString('en-IN')} total net pay`}
                      {payrollRunStatus.status === 'REOPENED' &&
                        `Reopened by ${payrollRunStatus.reopenedBy} on ${formatInstantIst(payrollRunStatus.reopenedAt)} IST${payrollRunStatus.reopenReason ? ` (${payrollRunStatus.reopenReason})` : ''}: recalculating live until closed again.`}
                      {payrollRunStatus.status === 'OPEN' &&
                        'Not locked yet. Salaries follow the attendance and can still change.'}
                    </p>
                  </div>
                </div>

                {payrollRunStatus.status === 'CLOSED' ? (
                  !isSuperAdmin ? (
                    <span className="text-[11px] font-semibold text-amber-800 bg-white border border-amber-300 rounded-xl px-3 py-2 shrink-0">Only an admin can open a locked month again</span>
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
                    <span>Check and lock {payrollMonth}</span>
                  </button>
                )}
              </div>
            ) : null}
          </div>

          {/* History */}
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-card overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/80">
              <h3 className="font-heading font-bold text-sm text-slate-900">Locked months</h3>
              <p className="text-[11px] text-slate-500">Every month that was locked, who locked it and when</p>
            </div>
            {payrollRunHistory.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-medium">No month has been locked yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Month</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Locked by</th>
                      <th className="py-3 px-4">Locked on</th>
                      <th className="py-3 px-4 text-right">People</th>
                      <th className="py-3 px-4 text-right">Total paid</th>
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

      {/* TAB 6: RULES (read-only rulebook) */}
      {activeTab === 'rules' && <RulesTab />}

      <PayrollCloseReviewModal
        month={payrollMonth}
        isOpen={isPayrollReviewOpen}
        onClose={() => setIsPayrollReviewOpen(false)}
        onConfirmed={handleConfirmedClose}
      />
    </div>
  );
};
