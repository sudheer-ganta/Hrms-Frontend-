import React from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  ClockAlert, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { DashboardStats } from '../../types';

interface StatsCardsProps {
  stats: DashboardStats | null;
  isLoading: boolean;
  selectedDate?: string;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, isLoading, selectedDate }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = !selectedDate || selectedDate === todayStr;

  const formattedDateLabel = selectedDate 
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Today';

  const totalWorkforce = stats?.totalWorkforce ?? 327;
  const present = stats?.presentCount ?? stats?.todayActiveEmployees ?? 0;
  const absent = stats?.absentCount ?? Math.max(0, totalWorkforce - present);
  const attendanceRate = stats?.attendanceRate ?? (Math.round((present / (totalWorkforce || 1)) * 100) || 0);
  const absenteeismRate = stats?.absenteeismRate ?? (Math.round((absent / (totalWorkforce || 1)) * 100) || 0);
  const lateCount = stats?.lateArrivalsCount ?? 0;
  const halfDayCount = stats?.halfDayCount ?? 0;
  const flagsTotal = lateCount + halfDayCount;

  const cards = [
    {
      title: 'Total Workforce',
      value: totalWorkforce.toLocaleString(),
      subtitle: 'Enrolled active employees',
      badge: 'Roster',
      badgeBg: 'text-brand-600 bg-sky-50 border border-sky-200/60',
      icon: Users,
      iconBg: 'bg-sky-100 text-[#1184b0]',
      hoverBorder: 'hover:border-[#1184b0]',
      glow: 'from-sky-400/10 to-[#1184b0]/20',
    },
    {
      title: isToday ? 'Present Today' : `Present (${formattedDateLabel})`,
      value: present.toLocaleString(),
      subtitle: `${attendanceRate}% verified biometric check-ins`,
      badge: `${attendanceRate}% Present`,
      badgeBg: 'text-emerald-700 bg-emerald-50 border border-emerald-200/60',
      icon: UserCheck,
      iconBg: 'bg-emerald-100 text-emerald-600',
      hoverBorder: 'hover:border-emerald-500',
      glow: 'from-emerald-400/10 to-teal-500/20',
    },
    {
      title: isToday ? 'Absent / Unaccounted' : `Absent (${formattedDateLabel})`,
      value: absent.toLocaleString(),
      subtitle: 'No biometric swipe detected',
      badge: `${absenteeismRate}% Absent`,
      badgeBg: absent > 0 ? 'text-rose-700 bg-rose-50 border border-rose-200/60' : 'text-slate-600 bg-slate-50',
      icon: UserX,
      iconBg: 'bg-rose-100 text-rose-600',
      hoverBorder: 'hover:border-rose-500',
      glow: 'from-rose-400/10 to-red-500/20',
    },
    {
      title: isToday ? 'Late Arrivals & P/2' : `Late & P/2 (${formattedDateLabel})`,
      value: flagsTotal.toLocaleString(),
      subtitle: `${lateCount} Late (>9:30 AM), ${halfDayCount} Half-day`,
      badge: flagsTotal > 0 ? 'Shift Flags' : 'On Time',
      badgeBg: flagsTotal > 0 ? 'text-amber-700 bg-amber-50 border border-amber-200/60' : 'text-emerald-700 bg-emerald-50',
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
            className={`bg-white border border-slate-200/80 p-5 rounded-2xl relative overflow-hidden group ${card.hoverBorder} hover:shadow-soft transition-all shadow-card flex flex-col justify-between`}
          >
            {/* Soft Ambient Glow */}
            <div
              className={`absolute -right-4 -bottom-4 w-28 h-28 bg-gradient-to-br ${card.glow} rounded-full blur-xl pointer-events-none transition-all group-hover:scale-125`}
            />

            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-heading">
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
