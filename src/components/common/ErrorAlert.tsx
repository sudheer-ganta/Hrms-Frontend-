import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title = 'Failed to load data',
  message,
  onRetry,
  className,
}) => {
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 my-4 shadow-xs ${
        className || ''
      }`}
    >
      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-heading font-bold text-rose-900">{title}</h4>
        <p className="text-xs text-rose-700 mt-0.5 break-words font-sans">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-bold text-rose-700 bg-white hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shadow-xs active:scale-95 shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};

