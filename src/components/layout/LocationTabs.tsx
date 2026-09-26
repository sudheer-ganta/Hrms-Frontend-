import React from 'react';
import { Building2, Globe2 } from 'lucide-react';
import { AttendanceSource } from '../../types';

interface LocationTabsProps {
  sources: AttendanceSource[];
  activeSourceId: string;
  onSelectSource: (sourceId: string) => void;
  showAllOption?: boolean;
}

export const LocationTabs: React.FC<LocationTabsProps> = ({
  sources,
  activeSourceId,
  onSelectSource,
  showAllOption = true,
}) => {
  const getLocationDotColor = (id: string) => {
    if (id === 'office' || id.toLowerCase().includes('color')) return 'bg-[#1184b0]';
    if (id === 'budigere' || id.toLowerCase().includes('budi')) return 'bg-emerald-500';
    if (id === 'bidarahalli' || id.toLowerCase().includes('bida')) return 'bg-violet-500';
    return 'bg-brand-500';
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-card">
      {showAllOption && (
        <button
          type="button"
          onClick={() => onSelectSource('all')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 ${
            activeSourceId === 'all'
              ? 'font-bold bg-gradient-to-r from-[#1184b0] to-[#011638] text-white shadow-md shadow-[#1184b0]/20'
              : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${activeSourceId === 'all' ? 'bg-white' : 'bg-slate-400'}`} />
          <Globe2 className={`w-3.5 h-3.5 ${activeSourceId === 'all' ? 'text-white' : 'text-[#1184b0]'}`} />
          <span>All Locations</span>
        </button>
      )}

      {sources.map((source) => {
        const isActive = activeSourceId === source.id;
        const dotColor = getLocationDotColor(source.id);
        return (
          <button
            key={source.id}
            type="button"
            onClick={() => onSelectSource(source.id)}
            className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 ${
              isActive
                ? 'font-bold bg-gradient-to-r from-[#1184b0] to-[#011638] text-white shadow-md shadow-[#1184b0]/20'
                : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : dotColor}`} />
            <Building2 className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
            <span>{source.name}</span>
          </button>
        );
      })}
    </div>
  );
};
