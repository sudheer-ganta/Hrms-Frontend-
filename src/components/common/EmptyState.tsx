import React from 'react';
import { CalendarX, RefreshCw, FolderSearch } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: 'calendar' | 'search' | 'sync';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No attendance records found',
  description = 'Try changing the date range or syncing this location.',
  actionLabel,
  onAction,
  icon = 'calendar',
}) => {
  const renderIcon = () => {
    switch (icon) {
      case 'search':
        return <FolderSearch className="w-10 h-10 text-slate-400" />;
      case 'sync':
        return <RefreshCw className="w-10 h-10 text-brand-500 animate-spin" />;
      default:
        return <CalendarX className="w-10 h-10 text-slate-400" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl bg-slate-50 border border-slate-200 my-4 shadow-xs">
      <div className="p-4 bg-white border border-slate-200 rounded-2xl mb-4 shadow-card">
        {renderIcon()}
      </div>
      <h3 className="text-base font-heading font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-md mb-6 font-sans">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-heading font-bold text-white bg-gradient-to-r from-brand-500 to-brand-base hover:opacity-95 rounded-xl shadow-md shadow-brand-500/20 transition-all active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};

