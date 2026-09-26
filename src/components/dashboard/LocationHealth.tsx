import React from 'react';
import { Building2, RefreshCw } from 'lucide-react';
import { LocationBreakdown, AttendanceSource } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { formatDateTime } from '../../lib/utils';

interface LocationHealthProps {
  locations: LocationBreakdown[];
  sources: AttendanceSource[];
  onSyncLocation: (sourceId: string) => void;
  isLoading?: boolean;
  selectedDate?: string;
}

export const LocationHealth: React.FC<LocationHealthProps> = ({
  locations,
  sources,
  onSyncLocation,
  selectedDate,
}) => {
  const isToday = !selectedDate || selectedDate === new Date().toISOString().split('T')[0];

  const getCardTheme = (id: string) => {
    if (id === 'office' || id.toLowerCase().includes('color')) {
      return {
        borderHover: 'hover:border-[#1184b0]',
        badgeText: 'text-[#1184b0]',
        btnStyle: 'bg-sky-50 hover:bg-[#1184b0] text-[#1184b0] hover:text-white border-sky-200',
        accentColor: 'text-[#1184b0]',
      };
    }
    if (id === 'budigere' || id.toLowerCase().includes('budi')) {
      return {
        borderHover: 'hover:border-emerald-500',
        badgeText: 'text-emerald-600',
        btnStyle: 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border-emerald-200',
        accentColor: 'text-emerald-600',
      };
    }
    return {
      borderHover: 'hover:border-violet-500',
      badgeText: 'text-violet-600',
      btnStyle: 'bg-violet-50 hover:bg-violet-600 text-violet-700 hover:text-white border-violet-200',
      accentColor: 'text-violet-600',
    };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 font-heading">
          <Building2 className="w-4 h-4 text-[#1184b0]" />
          <span>Biometric Location Hubs</span>
        </h3>
        <span className="text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-xl font-medium shadow-xs">
          3 Configured Biometric Sources
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sources.map((source) => {
          const locData = locations.find((l) => l.sourceId === source.id);
          const todayPunches = locData?.todayPunches ?? 0;
          const activeEmps = locData?.activeEmployeesToday ?? 0;
          const totalPunches = locData?.totalPunches ?? 0;
          const lastSyncAt = locData?.lastSyncAt || source.lastSync;
          const theme = getCardTheme(source.id);

          return (
            <div
              key={source.id}
              className={`bg-white border border-slate-200/80 rounded-2xl p-5 ${theme.borderHover} hover:shadow-soft transition-all flex flex-col justify-between shadow-card`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm font-heading">{source.name}</h4>
                    <p className="text-[11px] text-slate-500 font-medium">ID: {source.id}</p>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Connected
                  </span>
                </div>

                {/* Workforce & Attendance breakdown */}
                <div className="grid grid-cols-3 gap-2 my-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <div>
                    <p className="text-[10px] text-emerald-700 uppercase font-extrabold">Present</p>
                    <p className="text-sm font-extrabold text-emerald-600 mt-0.5 font-heading">
                      {locData?.presentCount ?? locData?.activeEmployeesToday ?? 0}
                    </p>
                  </div>
                  <div className="border-x border-slate-200">
                    <p className="text-[10px] text-rose-700 uppercase font-extrabold">Absent</p>
                    <p className="text-sm font-extrabold text-rose-600 mt-0.5 font-heading">
                      {locData?.absentCount ?? Math.max(0, (locData?.totalWorkforce ?? 50) - (locData?.activeEmployeesToday ?? 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-extrabold">Workforce</p>
                    <p className="text-sm font-extrabold text-slate-800 mt-0.5 font-heading">
                      {locData?.totalWorkforce ?? (source.id === 'office' ? 21 : source.id === 'budigere' ? 256 : 50)}
                    </p>
                  </div>
                </div>

                {/* Mini Attendance progress bar */}
                <div className="space-y-1 mb-2">
                  <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                    <span>Attendance Rate</span>
                    <span className="font-bold text-slate-800">{locData?.attendanceRate ?? 85}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${locData?.attendanceRate ?? 85}%` }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-medium">
                  Last Sync: {lastSyncAt ? formatDateTime(lastSyncAt) : 'Ready'}
                </span>
                <button
                  type="button"
                  onClick={() => onSyncLocation(source.id)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1 font-bold shadow-xs active:scale-95 ${theme.btnStyle}`}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sync</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
