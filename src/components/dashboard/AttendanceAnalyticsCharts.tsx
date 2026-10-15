import React, { useState } from 'react';
import { PieChart as PieIcon, BarChart3, TrendingUp, Users, Clock, Building2 } from 'lucide-react';
import { DashboardStats, LocationBreakdown } from '../../types';

interface AttendanceAnalyticsChartsProps {
  stats: DashboardStats | null;
  locations?: LocationBreakdown[];
  isLoading?: boolean;
  activeSourceId?: string;
  activeSourceName?: string;
}

export const AttendanceAnalyticsCharts: React.FC<AttendanceAnalyticsChartsProps> = ({
  stats,
  locations,
  isLoading,
  activeSourceId,
  activeSourceName,
}) => {
  const [activeChartTab, setActiveChartTab] = useState<'attendance' | 'traffic' | 'locations'>('attendance');

  const safeLocations = Array.isArray(locations) && locations.length > 0 
    ? locations 
    : (Array.isArray(stats?.locationBreakdown) ? stats.locationBreakdown : []);

  // Counts come from the backend resolver; the shares below are only chart geometry (count / roster).
  const totalWorkforce = stats?.totalWorkforce ?? 0;
  const present = stats?.presentCount ?? 0;
  const absent = stats?.absentCount ?? 0;
  const halfDay = stats?.halfDayCount ?? 0;

  const share = (n: number) => (totalWorkforce > 0 ? Math.round((n / totalWorkforce) * 100) : 0);
  const presentPct = share(present);
  const absentPct = share(absent);
  const halfDayPct = share(halfDay);

  // Dynamic hourly punch distribution
  const hourlyData = (stats?.hourlyDistribution && stats.hourlyDistribution.length > 0)
    ? stats.hourlyDistribution
    : [
        { hour: '07:00', punches: 0, label: '7 AM' },
        { hour: '08:00', punches: 0, label: '8 AM' },
        { hour: '09:00', punches: 0, label: '9 AM' },
        { hour: '10:00', punches: 0, label: '10 AM' },
        { hour: '11:00', punches: 0, label: '11 AM' },
        { hour: '12:00', punches: 0, label: '12 PM' },
        { hour: '13:00', punches: 0, label: '1 PM' },
        { hour: '14:00', punches: 0, label: '2 PM' },
        { hour: '15:00', punches: 0, label: '3 PM' },
        { hour: '16:00', punches: 0, label: '4 PM' },
        { hour: '17:00', punches: 0, label: '5 PM' },
        { hour: '18:00', punches: 0, label: '6 PM' },
        { hour: '19:00', punches: 0, label: '7 PM' },
        { hour: '20:00', punches: 0, label: '8 PM' },
      ];

  const maxHourly = Math.max(...hourlyData.map((d) => d.punches), 1);
  const peakSlot = hourlyData.reduce((max, cur) => (cur.punches > max.punches ? cur : max), hourlyData[0]);

  // Location share
  const totalLocPunches = (safeLocations || []).reduce((sum, l) => sum + (l?.todayPunches || 0), 0) || (stats?.todayPunches || 1);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-card space-y-6">
      {/* Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-heading font-bold text-slate-900 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#1184b0]" />
            <span>Biometric Analytics & Real-Time Punch Visualizations</span>
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Breakdown of present vs absent rates, peak biometric traffic hours, and multi-location distribution
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveChartTab('attendance')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeChartTab === 'attendance'
                ? 'bg-white text-[#1184b0] shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>Status Ratio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChartTab('traffic')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeChartTab === 'traffic'
                ? 'bg-white text-[#1184b0] shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Hourly Swipes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChartTab('locations')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeChartTab === 'locations'
                ? 'bg-white text-[#1184b0] shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Location Share</span>
          </button>
        </div>
      </div>

      {/* View 1: Status Donut Chart & Metrics */}
      {activeChartTab === 'attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Donut Chart SVG */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-sky-50/40 rounded-2xl border border-slate-100">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Track */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#e2e8f0"
                  strokeWidth="12"
                  fill="transparent"
                />
                {/* Present (Emerald) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray={`${presentPct * 2.38} 238`}
                  strokeDashoffset="0"
                  fill="transparent"
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
                {/* Absent (Rose) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#f43f5e"
                  strokeWidth="12"
                  strokeDasharray={`${absentPct * 2.38} 238`}
                  strokeDashoffset={`${-(presentPct * 2.38)}`}
                  fill="transparent"
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
                {/* Half Day (Amber) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#f59e0b"
                  strokeWidth="12"
                  strokeDasharray={`${halfDayPct * 2.38} 238`}
                  strokeDashoffset={`${-((presentPct + absentPct) * 2.38)}`}
                  fill="transparent"
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Center Content */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
                  {stats?.attendanceRate == null ? 'N/A' : `${stats.attendanceRate}%`}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                  Attendance Rate
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 font-medium mt-3 text-center">
              {activeSourceId && activeSourceId !== 'all'
                ? `${activeSourceName || 'Selected Location'} • ${present} Present of ${totalWorkforce} Enrolled`
                : `Consolidated Live Ratio across all 3 locations (${present} Present / ${totalWorkforce} Total)`}
            </p>
          </div>

          {/* Details & Breakdown Cards */}
          <div className="lg:col-span-7 space-y-3">
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 font-heading">Present Staff</h4>
                  <p className="text-[11px] text-slate-500">Verified biometric check-ins on floor</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-extrabold font-heading text-emerald-700">{present}</span>
                <span className="text-xs text-emerald-600 block font-bold">{presentPct}%</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 font-heading">Absent / Missing</h4>
                  <p className="text-[11px] text-slate-500">No swipe detected or unverified records</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-extrabold font-heading text-rose-700">{absent}</span>
                <span className="text-xs text-rose-600 block font-bold">{absentPct}%</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 font-heading">Half-Day (P/2)</h4>
                  <p className="text-[11px] text-slate-500">Worked less than a full day (per the shift policy)</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-extrabold font-heading text-amber-700">{halfDay}</span>
                <span className="text-xs text-amber-600 block font-bold">{halfDayPct}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Hourly Punch Traffic Bar Graph */}
      {activeChartTab === 'traffic' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Punch Volume by Hour</span>
            <span className="font-medium text-[#1184b0]">
              {peakSlot && peakSlot.punches > 0 
                ? `Peak traffic: ${peakSlot.label} (${peakSlot.punches} swipes)`
                : 'No punches recorded for selected timeframe'}
            </span>
          </div>

          <div className="flex items-end gap-1 h-44 pt-6 pb-2 px-2 bg-slate-50 rounded-2xl border border-slate-100 overflow-x-auto">
            {hourlyData.map((item, index) => {
              const heightPct = Math.round((item.punches / maxHourly) * 100);
              const isPeak = heightPct > 75;
              return (
                <div key={index} className="flex flex-col items-center h-full justify-end group flex-1 min-w-[18px]">
                  <span className="text-[10px] font-bold text-slate-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.punches}
                  </span>
                  <div className="w-full bg-slate-200 rounded-t-lg relative flex items-end h-full overflow-hidden">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        isPeak
                          ? 'bg-gradient-to-t from-[#011638] to-[#1184b0]'
                          : 'bg-gradient-to-t from-sky-400 to-[#1184b0]'
                      }`}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 mt-2 whitespace-nowrap">
                    {item.hour.split(':')[0]}h
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View 3: Location Punch Share */}
      {activeChartTab === 'locations' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {safeLocations.length === 0 && (
              <p className="text-xs text-slate-500 md:col-span-3">No location data for this date.</p>
            )}
            {safeLocations.map((loc) => {
              const count = loc.todayPunches || 0;
              const sharePct = Math.round((count / totalLocPunches) * 100) || 0;
              const isPrimary = count > 0 && count === Math.max(...safeLocations.map((l) => l.todayPunches || 0));

              return (
                <div
                  key={loc.sourceId}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#1184b0]" />
                      <h4 className="font-heading font-bold text-slate-900 text-xs">{loc.sourceName}</h4>
                    </div>
                    <span className="text-xs font-bold text-[#1184b0]">{sharePct}% Share</span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${sharePct}%` }}
                      className={`h-full rounded-full ${
                        isPrimary
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                          : 'bg-gradient-to-r from-[#1184b0] to-[#011638]'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{count} Swipes recorded</span>
                    <span>{loc.presentCount} Present of {loc.totalWorkforce}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
