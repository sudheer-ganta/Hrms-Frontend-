import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  CloudDownload,
  Clock,
  Fingerprint,
  Circle,
} from 'lucide-react';
import { api } from '../../services/api';
import { AttendanceSource } from '../../types';
import { humanizeSyncError } from '../../lib/utils';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: AttendanceSource[];
  activeSourceId: string;
  onSyncComplete?: () => void;
}

type ApiMode = 'inout' | 'raw';
type Phase = 'idle' | 'running' | 'done';
type LocationStatus = 'pending' | 'running' | 'success' | 'error';

interface LocationProgress {
  sourceId: string;
  sourceName: string;
  status: LocationStatus;
  count?: number;
  error?: string;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  sources,
  activeSourceId,
  onSyncComplete,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<string>(activeSourceId || 'office');
  const [syncScope, setSyncScope] = useState<'single' | 'all'>('all');
  const [apiMode, setApiMode] = useState<ApiMode>('inout');
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [empCode, setEmpCode] = useState<string>('ALL');

  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<LocationProgress[]>([]);

  useEffect(() => {
    if (activeSourceId && activeSourceId !== 'all') {
      setSelectedLocation(activeSourceId);
    }
  }, [activeSourceId]);

  if (!isOpen) return null;

  const recordWord = apiMode === 'inout' ? 'attendance record' : 'punch';

  const updateProgress = (sourceId: string, patch: Partial<LocationProgress>) => {
    setProgress((prev) => prev.map((p) => (p.sourceId === sourceId ? { ...p, ...patch } : p)));
  };

  const runSync = async (targets: AttendanceSource[]) => {
    if (targets.length === 0) return;

    setPhase('running');

    for (const target of targets) {
      updateProgress(target.id, { status: 'running' });
      const payload = { fromDate, toDate, empCode: empCode.trim() || 'ALL' };

      try {
        const res =
          apiMode === 'inout'
            ? await api.syncInOutSource(target.id, payload)
            : await api.syncSource(target.id, payload);

        const count = res.count ?? res.inserted ?? 0;

        if (res.success === false) {
          updateProgress(target.id, {
            status: 'error',
            error: res.error || 'Sync failed for an unknown reason.',
          });
        } else {
          updateProgress(target.id, { status: 'success', count });
        }
      } catch (err: any) {
        const msg =
          err.response?.data?.error || err.message || 'Failed to sync attendance records.';
        updateProgress(target.id, { status: 'error', error: msg });
      }
    }

    setPhase('done');
    if (onSyncComplete) onSyncComplete();
  };

  const handleStartSync = () => {
    const targets =
      syncScope === 'all' ? sources : sources.filter((s) => s.id === selectedLocation);
    setProgress(
      targets.map((s) => ({ sourceId: s.id, sourceName: s.name, status: 'pending' as const }))
    );
    runSync(targets);
  };

  const handleRetryFailed = () => {
    const failedIds = new Set(progress.filter((p) => p.status === 'error').map((p) => p.sourceId));
    const targets = sources.filter((s) => failedIds.has(s.id));
    setProgress((prev) =>
      prev.map((p) => (failedIds.has(p.sourceId) ? { ...p, status: 'pending', error: undefined } : p))
    );
    runSync(targets);
  };

  const handleClose = () => {
    if (phase === 'running') return; // don't allow closing mid-sync
    setPhase('idle');
    setProgress([]);
    onClose();
  };

  const successCount = progress.filter((p) => p.status === 'success').length;
  const errorCount = progress.filter((p) => p.status === 'error').length;
  const totalSynced = progress.reduce((acc, p) => acc + (p.count || 0), 0);
  const allDone = phase === 'done';

  let bannerTone: 'success' | 'warning' | 'error' = 'success';
  if (allDone) {
    if (errorCount === 0) bannerTone = 'success';
    else if (successCount === 0) bannerTone = 'error';
    else bannerTone = 'warning';
  }

  const bannerCopy = {
    success: {
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />,
      wrap: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      title: 'All Locations Synced Successfully',
      subtitle: `${totalSynced.toLocaleString()} ${recordWord}${totalSynced === 1 ? '' : 's'} saved across ${successCount} location${successCount === 1 ? '' : 's'}.`,
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />,
      wrap: 'bg-amber-50 border-amber-200 text-amber-800',
      title: `Synced with Issues — ${errorCount} of ${progress.length} Location${progress.length === 1 ? '' : 's'} Failed`,
      subtitle: `${totalSynced.toLocaleString()} ${recordWord}${totalSynced === 1 ? '' : 's'} saved from the locations that succeeded. See details below for what to do about the rest.`,
    },
    error: {
      icon: <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />,
      wrap: 'bg-rose-50 border-rose-200 text-rose-800',
      title: 'Sync Failed',
      subtitle: 'No locations could be synced. See details below.',
    },
  }[bannerTone];

  const selectedSourceName =
    sources.find((s) => s.id === selectedLocation)?.name || 'Selected Location';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-100 text-brand-600 rounded-xl shadow-xs">
              <RefreshCw className={`w-5 h-5 ${phase === 'running' ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-base font-heading font-bold text-slate-900">Sync Attendance Data</h2>
              <p className="text-xs text-slate-500 font-sans">
                Pulls the latest attendance from your biometric devices at each location
              </p>
            </div>
          </div>
          {phase !== 'running' && (
            <button
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {phase === 'idle' && (
            <div className="space-y-4">
              {/* API Mode Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  What do you want to sync?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setApiMode('inout')}
                    className={`p-3.5 rounded-xl text-left border transition-all ${
                      apiMode === 'inout'
                        ? 'bg-gradient-to-r from-brand-500 to-brand-base text-white border-transparent shadow-md shadow-brand-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-heading font-bold text-xs">
                      <Clock className="w-4 h-4" />
                      <span>Daily Attendance &amp; Hours</span>
                      <span
                        className={`ml-auto text-[9px] font-mono px-1 rounded ${apiMode === 'inout' ? 'text-white/60' : 'text-slate-400'}`}
                      >
                        API 3
                      </span>
                    </div>
                    <p
                      className={`text-[10px] mt-1 font-sans ${apiMode === 'inout' ? 'text-white/80' : 'text-slate-500'}`}
                    >
                      Check-in/out times, working hours, overtime &amp; who was present or absent. Recommended for day-to-day use.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setApiMode('raw')}
                    className={`p-3.5 rounded-xl text-left border transition-all ${
                      apiMode === 'raw'
                        ? 'bg-gradient-to-r from-brand-500 to-brand-base text-white border-transparent shadow-md shadow-brand-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-heading font-bold text-xs">
                      <Fingerprint className="w-4 h-4" />
                      <span>Raw Fingerprint Scans</span>
                      <span
                        className={`ml-auto text-[9px] font-mono px-1 rounded ${apiMode === 'raw' ? 'text-white/60' : 'text-slate-400'}`}
                      >
                        API 2
                      </span>
                    </div>
                    <p
                      className={`text-[10px] mt-1 font-sans ${apiMode === 'raw' ? 'text-white/80' : 'text-slate-500'}`}
                    >
                      Every individual punch with machine ID and timestamp. For audits/troubleshooting, not everyday use.
                    </p>
                  </button>
                </div>
              </div>

              {/* Sync Target Switcher */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Where from?</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSyncScope('all')}
                    className={`py-2 px-3 text-xs rounded-lg transition-all ${
                      syncScope === 'all'
                        ? 'bg-white text-slate-900 shadow-sm font-heading font-bold border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900 font-semibold'
                    }`}
                  >
                    All 3 Locations
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyncScope('single')}
                    className={`py-2 px-3 text-xs rounded-lg transition-all ${
                      syncScope === 'single'
                        ? 'bg-white text-slate-900 shadow-sm font-heading font-bold border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900 font-semibold'
                    }`}
                  >
                    Just One Location
                  </button>
                </div>
              </div>

              {/* Location Selector (if single) */}
              {syncScope === 'single' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Select Location
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {sources.map((src) => (
                      <button
                        key={src.id}
                        type="button"
                        onClick={() => setSelectedLocation(src.id)}
                        className={`p-2.5 rounded-xl text-left border transition-all ${
                          selectedLocation === src.id
                            ? 'bg-sky-50 border-brand-500 text-brand-700 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-heading font-bold text-xs truncate">{src.name}</div>
                        <div className="text-[10px] text-slate-500 capitalize">{src.status}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Range Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-brand-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-brand-500 cursor-pointer"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-sans -mt-2">
                Larger date ranges and "All 3 Locations" take longer — usually a few seconds per location.
              </p>
            </div>
          )}

          {/* Live per-location progress (shown while running AND after completion) */}
          {phase !== 'idle' && (
            <div className="py-2 space-y-4">
              {phase === 'running' && (
                <div className="text-center space-y-1">
                  <h3 className="text-base font-heading font-bold text-slate-900">
                    Syncing {syncScope === 'all' ? 'All Locations' : selectedSourceName}…
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    {successCount + errorCount} of {progress.length} location
                    {progress.length === 1 ? '' : 's'} done
                  </p>
                </div>
              )}

              {allDone && (
                <div className={`flex items-start gap-3 p-4 rounded-xl border ${bannerCopy.wrap}`}>
                  {bannerCopy.icon}
                  <div>
                    <h3 className="font-heading font-bold text-sm">{bannerCopy.title}</h3>
                    <p className="text-xs font-sans mt-0.5 opacity-90">{bannerCopy.subtitle}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                {progress.map((p) => (
                  <div
                    key={p.sourceId}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                      p.status === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : p.status === 'error'
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : p.status === 'running'
                        ? 'bg-sky-50 border-brand-500 text-brand-700 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        p.status === 'success'
                          ? 'bg-emerald-500 text-white'
                          : p.status === 'error'
                          ? 'bg-rose-500 text-white'
                          : p.status === 'running'
                          ? 'bg-brand-500 text-white'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {p.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : p.status === 'error' ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : p.status === 'running' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-heading font-bold">{p.sourceName}</span>
                        {p.status === 'success' && (
                          <span className="text-[11px] font-mono font-bold shrink-0">
                            {(p.count || 0).toLocaleString()} {recordWord}
                            {(p.count || 0) === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-sans mt-0.5 leading-relaxed">
                        {p.status === 'pending' && 'Waiting…'}
                        {p.status === 'running' && `Talking to ${p.sourceName}'s biometric system…`}
                        {p.status === 'success' && 'Synced successfully.'}
                        {p.status === 'error' && humanizeSyncError(p.error)}
                      </p>
                      {p.status === 'error' && p.error && (
                        <p className="text-[10px] font-mono mt-1 opacity-60 break-words">{p.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          {phase === 'idle' ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartSync}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-heading font-bold text-white bg-gradient-to-r from-brand-500 to-brand-base hover:opacity-95 rounded-xl shadow-md shadow-brand-500/20 transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Start Sync</span>
              </button>
            </>
          ) : phase === 'running' ? (
            <span className="text-[11px] text-slate-400 font-sans inline-flex items-center gap-1.5">
              <CloudDownload className="w-3.5 h-3.5 animate-pulse" />
              Please keep this open until it finishes…
            </span>
          ) : (
            <>
              {errorCount > 0 && (
                <button
                  type="button"
                  onClick={handleRetryFailed}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-heading font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl shadow-xs transition-all active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Failed</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 text-xs font-heading font-bold text-white bg-gradient-to-r from-brand-500 to-brand-base hover:opacity-95 rounded-xl shadow-md shadow-brand-500/20 transition-all active:scale-95"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
