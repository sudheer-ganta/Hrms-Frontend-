import React from 'react';
import { InOutSummary } from '../../types';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Timer
} from 'lucide-react';

interface AttendanceSummaryMetricsProps {
  summary: InOutSummary | undefined;
  isLoading?: boolean;
}

export const AttendanceSummaryMetrics: React.FC<AttendanceSummaryMetricsProps> = ({
  summary,
}) => {
  if (!summary) return null;

  const avgHours = summary.avgWorkMinutes > 0
    ? `${Math.floor(summary.avgWorkMinutes / 60)}h ${summary.avgWorkMinutes % 60}m`
    : '0h 00m';

  const totalOtHours = summary.totalOvertimeMinutes > 0
    ? `${Math.floor(summary.totalOvertimeMinutes / 60)}h ${summary.totalOvertimeMinutes % 60}m`
    : '0h';

  const presentPercentage = summary.totalRecords > 0
    ? Math.round((summary.presentCount / summary.totalRecords) * 100)
    : 0;

  const metrics = [
    {
      label: 'Present Attendance',
      value: summary.presentCount.toLocaleString(),
      subtext: `${presentPercentage}% Present Rate`,
      icon: CheckCircle2,
      accent: 'bg-emerald-100 text-emerald-600',
      glow: 'from-emerald-400/10 to-teal-500/20',
      borderHover: 'hover:border-emerald-500',
    },
    {
      label: 'Absent Recorded',
      value: summary.absentCount.toLocaleString(),
      subtext: `${summary.halfDayCount} Half-day entries`,
      icon: XCircle,
      accent: 'bg-rose-100 text-rose-600',
      glow: 'from-rose-400/10 to-red-500/20',
      borderHover: 'hover:border-rose-500',
    },
    {
      label: 'Avg Daily Working Hours',
      value: avgHours,
      subtext: 'Calculated from In/Out punches',
      icon: Clock,
      accent: 'bg-sky-100 text-brand-500',
      glow: 'from-sky-400/10 to-brand-500/20',
      borderHover: 'hover:border-brand-500',
    },
    {
      label: 'Total Overtime & Late In',
      value: totalOtHours,
      subtext: `${summary.lateArrivalsCount.toLocaleString()} Late check-ins`,
      icon: Timer,
      accent: 'bg-amber-100 text-amber-600',
      glow: 'from-amber-400/10 to-orange-500/20',
      borderHover: 'hover:border-amber-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className={`p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card ${item.borderHover} hover:shadow-soft transition-all relative overflow-hidden flex flex-col justify-between`}
          >
            <div className={`absolute -right-4 -bottom-4 w-28 h-28 bg-gradient-to-br ${item.glow} rounded-full blur-xl pointer-events-none`} />
            
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</span>
                <div className="text-2xl md:text-3xl font-heading font-extrabold text-slate-900 mt-1.5 tracking-tight">{item.value}</div>
              </div>
              <div className={`p-2.5 rounded-2xl ${item.accent} shadow-xs`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-[11px] text-slate-500 font-sans font-medium flex items-center justify-between">
              <span>{item.subtext}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

