import React, { useState, useEffect } from 'react';
import { StatsCards } from '../components/dashboard/StatsCards';
import { LocationHealth } from '../components/dashboard/LocationHealth';
import { AttendanceAnalyticsCharts } from '../components/dashboard/AttendanceAnalyticsCharts';
import { LocationTabs } from '../components/layout/LocationTabs';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { api } from '../services/api';
import { DashboardStats, AttendanceSource } from '../types';
import { 
  RefreshCw, 
  ArrowRight, 
  Clock, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardPageProps {
  sources: AttendanceSource[];
  activeSourceId: string;
  onSelectSource: (id: string) => void;
  onOpenSync: (sourceId?: string) => void;
}

export const Dashboard: React.FC<DashboardPageProps> = ({
  sources,
  activeSourceId,
  onSelectSource,
  onOpenSync,
}) => {
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isToday = selectedDate === getTodayStr();

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getDashboardStats({
        date: selectedDate,
        sourceId: activeSourceId !== 'all' ? activeSourceId : undefined,
      });
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedDate, activeSourceId]);

  const changeDateByDays = (days: number) => {
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const handleSyncLocation = (sourceId: string) => {
    onOpenSync(sourceId);
  };

  const formattedDateTitle = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const activeSourceObj = sources.find((s) => s.id === activeSourceId);
  const activeSourceName = activeSourceObj ? activeSourceObj.name : (activeSourceId === 'all' ? 'All Locations' : activeSourceId);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Navigation */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              ColorMyles HRMS Dashboard
              <span className="text-[10px] bg-brand-500/15 text-brand-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                {isToday ? 'Live Today' : 'Daily View'}
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Multi-location biometric attendance, work hours tracking, and device sync management
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/attendance"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-base hover:opacity-95 rounded-xl text-xs font-heading font-bold text-white shadow-md shadow-brand-500/20 transition-all active:scale-95"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Daily In/Out & Timesheets</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={fetchStats}
              disabled={isLoading}
              className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-brand-500 rounded-xl transition-all shadow-card"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Location Tabs */}
        <LocationTabs
          sources={sources}
          activeSourceId={activeSourceId}
          onSelectSource={onSelectSource}
          showAllOption={true}
        />

        {/* Date Filter & Stepper Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-card flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayStr())}
                className={`px-3 py-1.5 rounded-lg text-xs font-heading font-bold transition-all ${
                  isToday
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(getYesterdayStr())}
                className={`px-3 py-1.5 rounded-lg text-xs font-heading font-bold transition-all ${
                  selectedDate === getYesterdayStr()
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                Yesterday
              </button>
            </div>

            {/* Stepper buttons (< and >) */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => changeDateByDays(-1)}
                className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-brand-500 transition-all"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => changeDateByDays(1)}
                disabled={isToday}
                className={`p-2 border rounded-xl transition-all ${
                  isToday 
                    ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' 
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-brand-500'
                }`}
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar Date Picker Input */}
            <div className="relative flex items-center">
              <Calendar className="w-4 h-4 text-brand-500 absolute left-3 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                max={getTodayStr()}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-heading font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer shadow-xs"
              />
            </div>
          </div>

          {/* Current Date Status Badge */}
          <div className="flex items-center gap-2 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-brand-500" />
              <span className="text-xs font-heading font-extrabold text-slate-800">
                {formattedDateTitle}
              </span>
            </div>

            {isToday ? (
              <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Feed
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayStr())}
                className="text-[10px] font-bold px-2.5 py-1 bg-sky-50 text-brand-600 border border-sky-200/60 rounded-full hover:bg-brand-500 hover:text-white transition-all flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Return to Today
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <ErrorAlert
          title="Could not connect to API"
          message={error}
          onRetry={fetchStats}
        />
      )}

      {/* KPI Cards */}
      <StatsCards stats={stats} isLoading={isLoading} selectedDate={selectedDate} />

      {/* Rich Charts & Graphs Section */}
      <AttendanceAnalyticsCharts 
        stats={stats} 
        locations={stats?.locationBreakdown || []} 
        isLoading={isLoading} 
        activeSourceId={activeSourceId}
        activeSourceName={activeSourceName}
      />

      {/* Location Health Status Cards */}
      <LocationHealth
        locations={stats?.locationBreakdown || []}
        sources={sources}
        onSyncLocation={handleSyncLocation}
        isLoading={isLoading}
        selectedDate={selectedDate}
      />
    </div>
  );
};


