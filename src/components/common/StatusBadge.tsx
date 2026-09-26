import React from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Radio } from 'lucide-react';

interface StatusBadgeProps {
  status: 'connected' | 'success' | 'failed' | 'running' | 'partial' | 'credentials_missing' | 'ready' | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className,
}) => {
  const normStatus = (status || '').toLowerCase();

  let bgClass = 'bg-slate-100 text-slate-700 border border-slate-200';
  let icon = <Radio className="w-3 h-3 text-slate-500" />;
  let label = status;

  if (normStatus === 'connected' || normStatus === 'success' || normStatus === 'ready') {
    bgClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold';
    icon = <CheckCircle2 className="w-3 h-3 text-emerald-600" />;
    label = normStatus === 'ready' ? 'Ready' : 'Connected';
  } else if (normStatus === 'running' || normStatus === 'syncing') {
    bgClass = 'bg-sky-50 text-brand-700 border border-sky-200 font-bold';
    icon = <RefreshCw className="w-3 h-3 text-brand-600 animate-spin" />;
    label = 'Syncing...';
  } else if (normStatus === 'partial') {
    bgClass = 'bg-amber-50 text-amber-700 border border-amber-200 font-bold';
    icon = <AlertTriangle className="w-3 h-3 text-amber-600" />;
    label = 'Partial';
  } else if (normStatus === 'failed' || normStatus === 'error') {
    bgClass = 'bg-rose-50 text-rose-700 border border-rose-200 font-bold';
    icon = <XCircle className="w-3 h-3 text-rose-600" />;
    label = 'Failed';
  } else if (normStatus === 'credentials_missing') {
    bgClass = 'bg-amber-50 text-amber-700 border border-amber-200 font-bold';
    icon = <AlertTriangle className="w-3 h-3 text-amber-600" />;
    label = 'Missing Config';
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2.5 py-0.5 gap-1',
    md: 'text-xs px-3 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full transition-colors shadow-xs',
        sizeClasses,
        bgClass,
        className
      )}
    >
      {showIcon && icon}
      <span className="capitalize">{label}</span>
    </span>
  );
};

