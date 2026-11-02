import React from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  ClockAlert, 
} from 'lucide-react';
import { DashboardStats, DashboardListCategory } from '../../types';
import { formatBusinessDate, istToday } from '../../lib/businessDate';

interface StatsCardsProps {
  stats: DashboardStats | null;
  isLoading: boolean;
  selectedDate?: string;
  /** Called when a card is clicked: which group of employees to list, and the card's title. */
  onSelectCard?: (category: DashboardListCategory, title: string) => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, isLoading, selectedDate, onSelectCard }) => {
  const isToday = !selectedDate || selectedDate === istToday();
  const formattedDateLabel = selectedDate ? formatBusinessDate(selectedDate) : 'Today';

  // Every figure comes from the backend. When it is not available we show "N/A", never an estimate.
  const num = (v: number | undefined | null) => (stats && v !== undefined && v !== null ? v.toLocaleString() : 'N/A');
  const pct = (v: number | null | undefined) => (v === null || v === undefined ? 'N/A' : `${v}%`);
  const noRoster = !!stats && stats.totalWorkforce === 0;
  const flagsTotal = stats ? stats.lateArrivalsCount + stats.halfDayCount : undefined;

  const cards: Array<{
    category: DashboardListCategory; title: string; value: string; subtitle: string; badge: string; badgeBg: string;
    icon: typeof Users; iconBg: string; hoverBorder: string; glow: string;
  }> = [
    {
      category: 'all',
      title: 'All Employees',
      value: num(stats?.totalWorkforce),
      subtitle: noRoster ? 'No active employees yet' : 'Currently working in the company',
      badge: '',
      badgeBg: 'text-brand-600 bg-sky-50 border border-sky-200/60',
      icon: Users,
      iconBg: 'bg-sky-100 text-[#1184b0]',
      hoverBorder: 'hover:border-[#1184b0]',
      glow: 'from-sky-400/10 to-[#1184b0]/20',
    },
    {
      category: 'present',
      title: isToday ? 'Present Today' : `Present (${formattedDateLabel})`,
      value: num(stats?.presentCount),
      subtitle: stats?.leaveCount ? `${stats.leaveCount} on paid leave, ${stats.weeklyOffCount} weekly off` : `${stats?.weeklyOffCount ?? 0} weekly off`,
      badge: `${pct(stats?.attendanceRate)} came`,
      badgeBg: 'text-emerald-700 bg-emerald-50 border border-emerald-200/60',
      icon: UserCheck,
      iconBg: 'bg-emerald-100 text-emerald-600',
      hoverBorder: 'hover:border-emerald-500',
      glow: 'from-emerald-400/10 to-teal-500/20',
    },
    {
      category: 'absent',
      title: isToday ? 'Absent Today' : `Absent (${formattedDateLabel})`,
      value: num(stats?.absentCount),
      subtitle: 'Working day, no attendance recorded',
      badge: `${pct(stats?.absenteeismRate)} absent`,
      badgeBg: (stats?.absentCount ?? 0) > 0 ? 'text-rose-700 bg-rose-50 border border-rose-200/60' : 'text-slate-600 bg-slate-50',
      icon: UserX,
      iconBg: 'bg-rose-100 text-rose-600',
      hoverBorder: 'hover:border-rose-500',
      glow: 'from-rose-400/10 to-red-500/20',
    },
    {
      category: 'flags',
      title: isToday ? 'Late or Half Day' : `Late or Half Day (${formattedDateLabel})`,
      value: num(flagsTotal),
      subtitle: `${stats?.lateArrivalsCount ?? 0} came late, ${stats?.halfDayCount ?? 0} half-day`,
      badge: (flagsTotal ?? 0) > 0 ? 'Check these' : 'All on time',
      badgeBg: (flagsTotal ?? 0) > 0 ? 'text-amber-700 bg-amber-50 border border-amber-200/60' : 'text-emerald-700 bg-emerald-50',
      icon: ClockAlert,
      iconBg: 'bg-amber-100 text-amber-600',
      hoverBorder: 'hover:border-amber-500',
      glow: 'from-amber-400/10 to-orange-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            role="button"
            tabIndex={0}
            title="Click to see the names"
            onClick={() => !isLoading && stats && onSelectCard?.(card.category, card.title)}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isLoading && stats) { e.preventDefault(); onSelectCard?.(card.category, card.title); } }}
            className={`bg-white border border-slate-200/80 p-5 rounded-2xl relative overflow-hidden group ${card.hoverBorder} hover:shadow-soft transition-all shadow-card flex flex-col justify-between cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40`}
          >
            {/* Soft Ambient Glow */}
            <div
              className={`absolute -right-4 -bottom-4 w-28 h-28 bg-gradient-to-br ${card.glow} rounded-full blur-xl pointer-events-none transition-all group-hover:scale-125`}
            />

            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm font-bold text-slate-600 font-heading">
                  {card.title}
                </span>
                <div className={`p-2.5 rounded-2xl ${card.iconBg} shadow-xs`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              {isLoading ? (
                <div className="h-9 w-24 bg-slate-100 rounded-lg animate-pulse my-1.5" />
              ) : (
                <h3 className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight text-slate-900 mt-1">
                  {card.value}
                </h3>
              )}
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              {card.badge && (
                <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${card.badgeBg}`}>
                  {card.badge}
                </span>
              )}
              <span>{card.subtitle}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
