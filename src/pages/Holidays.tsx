import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  PartyPopper, 
  CalendarDays,
  Clock,
  Building2,
  CalendarCheck2
} from 'lucide-react';
import { api } from '../services/api';
import { HRMSPolicySettings, CompanyHoliday } from '../types';

export const Holidays: React.FC = () => {
  const [policy, setPolicy] = useState<HRMSPolicySettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New Holiday Form State
  const [newDate, setNewDate] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newType, setNewType] = useState<'FESTIVAL' | 'NATIONAL' | 'OPTIONAL'>('FESTIVAL');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPolicySettings();
      setPolicy(data);
    } catch (err) {
      console.error('Failed to load corporate holidays:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newName.trim()) return;

    setIsAdding(true);
    try {
      await api.addHoliday({
        date: newDate,
        name: newName.trim(),
        type: newType,
      });
      setNewDate('');
      setNewName('');
      setSuccessMessage(`Holiday "${newName.trim()}" added successfully! All employees will receive paid holiday credit.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadData();
    } catch (err) {
      console.error('Failed to add holiday:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveHoliday = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from company holidays?`)) return;

    setDeleteLoadingId(id);
    try {
      await api.removeHoliday(id);
      setSuccessMessage(`Holiday "${name}" removed.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadData();
    } catch (err) {
      console.error('Failed to delete holiday:', err);
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const holidays = (policy?.holidays || []).sort((a, b) => a.date.localeCompare(b.date));

  // Current year / upcoming breakdown
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toISOString().substring(0, 7);

  const monthHolidays = holidays.filter(h => h.date.startsWith(currentMonth));

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <PartyPopper className="w-6 h-6 text-purple-600" />
            <span>Corporate Paid Holidays & Calendar</span>
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Add company-wide festival and national holidays. Every holiday added here is 100% paid with <strong>0 Loss of Pay (LOP)</strong> deduction for all employees.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-purple-50 border border-purple-200/80 px-3.5 py-2 rounded-xl text-purple-800 text-xs font-semibold shadow-xs">
          <ShieldCheck className="w-4 h-4 text-purple-600" />
          <span>Full Salary Pay Protection Active</span>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Active Holidays</span>
            <span className="text-2xl font-heading font-extrabold text-purple-700 mt-1 block">{holidays.length} Days</span>
            <span className="text-[10px] text-slate-500">Configured in ColorMyles HRMS</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">This Month (Sep 2026)</span>
            <span className="text-2xl font-heading font-extrabold text-emerald-600 mt-1 block">{monthHolidays.length} Day</span>
            <span className="text-[10px] text-slate-500">Credited to all 397+ staff</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pay Protection</span>
            <span className="text-2xl font-heading font-extrabold text-[#1184b0] mt-1 block">100% Paid</span>
            <span className="text-[10px] text-slate-500">0 LOP deduction applied</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-sky-100 text-[#1184b0] flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Container: Add Holiday Form + Holiday Calendar List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quick Add Form */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-heading font-bold text-slate-900">Add New Holiday</h2>
              <p className="text-[10px] text-slate-400">Save festival or corporate company off</p>
            </div>
          </div>

          <form onSubmit={handleAddHoliday} className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Holiday Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-purple-600 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Holiday / Festival Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Vinayaka Chavithi, Diwali, Christmas"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-purple-600 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Holiday Category
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-purple-600 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none transition font-medium"
              >
                <option value="FESTIVAL">Festival Holiday</option>
                <option value="NATIONAL">National Holiday</option>
                <option value="OPTIONAL">Optional / Company Off</option>
              </select>
            </div>

            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 text-[11px] text-purple-900 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Auto-Syncs Immediately
              </span>
              <p className="text-[10px] text-purple-800/80 leading-relaxed">
                When you click Add, this date will automatically be marked in purple in all 397+ employee monthly grids and credited as payable without loss of pay.
              </p>
            </div>

            <button
              type="submit"
              disabled={isAdding || !newDate || !newName.trim()}
              className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 transition"
            >
              {isAdding ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Holiday...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add Corporate Holiday</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Active Holidays List */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-100 text-[#1184b0] flex items-center justify-center font-bold text-xs">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-heading font-bold text-slate-900">Configured Corporate Holidays</h2>
                <p className="text-[10px] text-slate-400">All registered company holidays with full pay protection</p>
              </div>
            </div>

            <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-lg">
              {holidays.length} Registered
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <div className="w-6 h-6 border-2 border-purple-600/30 border-t-purple-600 rounded-full animate-spin mx-auto" />
              <p>Loading holiday calendar...</p>
            </div>
          ) : holidays.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 p-8">
              <PartyPopper className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">No Corporate Holidays Configured Yet</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Use the form on the left to add your first company holiday (e.g. Vinayaka Chavithi, Diwali) so employees receive full pay credit.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {holidays.map((hol) => {
                const dateObj = new Date(hol.date + 'T00:00:00');
                const formattedDate = dateObj.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                const isUpcoming = hol.date >= new Date().toISOString().substring(0, 10);

                return (
                  <div
                    key={hol.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 hover:border-purple-300 bg-white flex items-center justify-between shadow-xs transition group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex flex-col items-center justify-center font-bold text-[11px] shadow-xs">
                        <span className="text-[9px] uppercase font-semibold leading-tight opacity-80">
                          {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-sm font-extrabold leading-tight">
                          {dateObj.getDate()}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition">
                            {hol.name}
                          </h3>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                            {hol.type || 'FESTIVAL'}
                          </span>
                          {isUpcoming && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700">
                              Upcoming
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-mono text-slate-600">{hol.date}</span>
                          <span>•</span>
                          <span>{formattedDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                        Paid Holiday (0 LOP)
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveHoliday(hol.id, hol.name)}
                        disabled={deleteLoadingId === hol.id}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
                        title="Delete Holiday"
                      >
                        {deleteLoadingId === hol.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-rose-600/30 border-t-rose-600 rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
