import React, { useState, useEffect } from 'react';
import {
  Clock,
  MapPin,
  CheckCircle2,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Building2,
  Navigation,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';

interface EmployeePunchCardProps {
  empCode: string;
  empName?: string;
  onPunchSuccess?: () => void;
}

interface GeoState {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  error?: string;
  loading: boolean;
  locationName: string;
}

export const EmployeePunchCard: React.FC<EmployeePunchCardProps> = ({
  empCode,
  empName,
  onPunchSuccess,
}) => {
  // Live Clock (IST)
  const [istTimeStr, setIstTimeStr] = useState<string>('');
  const [istDateStr, setIstDateStr] = useState<string>('');

  // Punch state
  const [punchStatus, setPunchStatus] = useState<{
    checkedIn: boolean;
    checkedOut: boolean;
    inTime: string;
    outTime: string;
    workTime: string;
    statusLabel: string;
    locationTag?: string;
  } | null>(null);

  const [geoState, setGeoState] = useState<GeoState>({
    loading: true,
    locationName: 'Detecting GPS location...',
  });

  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Update live clock every second using Asia/Kolkata timezone
  useEffect(() => {
    const updateISTClock = () => {
      const now = new Date();
      const timeFmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      const dateFmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      setIstTimeStr(timeFmt.format(now));
      setIstDateStr(dateFmt.format(now));
    };

    updateISTClock();
    const interval = setInterval(updateISTClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch today's punch status from server
  const loadTodayPunchStatus = async () => {
    try {
      const data = await api.getTodayPunchStatus(empCode);
      if (data) {
        setPunchStatus({
          checkedIn: data.checkedIn,
          checkedOut: data.checkedOut,
          inTime: data.inTime,
          outTime: data.outTime,
          workTime: data.workTime,
          statusLabel: data.statusLabel,
          locationTag: data.sourceName,
        });
      }
    } catch (err) {
      console.warn('Failed to load today punch status:', err);
    }
  };

  // Acquire Geolocation
  const requestLocation = () => {
    setGeoState((prev) => ({ ...prev, loading: true, error: undefined }));

    if (!navigator.geolocation) {
      setGeoState({
        loading: false,
        error: 'Geolocation is not supported by your browser.',
        locationName: 'Web ESS (GPS Unsupported)',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        // Simple client heuristic for office check
        let locName = `Field GPS (${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°)`;
        if (accuracy <= 100) {
          locName = `Accurate GPS Location (±${Math.round(accuracy)}m)`;
        }

        setGeoState({
          latitude,
          longitude,
          accuracy,
          loading: false,
          locationName: locName,
        });
      },
      (err) => {
        let msg = 'Unable to retrieve location';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission denied by user';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'GPS Position unavailable';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out';
        }

        setGeoState({
          loading: false,
          error: msg,
          locationName: 'Location Tagging Disabled',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  useEffect(() => {
    loadTodayPunchStatus();
    requestLocation();
  }, [empCode]);

  // Execute Punch
  const handlePunch = async (punchType: 'IN' | 'OUT') => {
    try {
      setSubmitting(true);
      setNotification(null);

      const res = await api.recordPunch({
        empCode,
        punchType,
        latitude: geoState.latitude,
        longitude: geoState.longitude,
        accuracy: geoState.accuracy,
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: res.message || `${punchType === 'IN' ? 'Check-In' : 'Check-Out'} successful!`,
        });

        await loadTodayPunchStatus();
        if (onPunchSuccess) onPunchSuccess();
      } else {
        setNotification({
          type: 'error',
          message: res.error || 'Failed to record punch.',
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.error || err.message || 'Error executing punch.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isCheckedIn = punchStatus?.checkedIn && punchStatus.inTime !== '--:--';
  const isCheckedOut = punchStatus?.checkedOut && punchStatus.outTime !== '--:--';

  return (
    <div className="bg-gradient-to-br from-white via-slate-50/70 to-sky-50/40 rounded-2xl border border-slate-200/80 shadow-md p-5 sm:p-6 transition-all relative overflow-hidden">
      {/* Decorative accent */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-sky-400/10 via-brand-500/5 to-transparent rounded-bl-full pointer-events-none" />

      {/* Header with Server Clock */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/70">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#1184b0]/15 flex items-center justify-center text-[#1184b0]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-heading font-bold text-slate-900 flex items-center gap-2">
                Live Attendance Punch
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Server IST Enforced
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Punches are timestamped strictly on the server (Indian Standard Time) with GPS verification.
              </p>
            </div>
          </div>
        </div>

        {/* Live IST Clock Display */}
        <div className="bg-slate-900 text-white px-4 py-2 rounded-xl shadow-inner flex flex-col items-end shrink-0">
          <div className="text-lg font-mono font-bold tracking-wider text-sky-300">
            {istTimeStr || '--:--:--'}
          </div>
          <div className="text-[10px] text-slate-400 font-medium tracking-wide">
            {istDateStr || 'IST (UTC+5:30)'}
          </div>
        </div>
      </div>

      {/* GPS Location Banner */}
      <div className="my-4 p-3 rounded-xl bg-slate-100/80 border border-slate-200 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-1.5 rounded-lg shrink-0 ${geoState.latitude ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            <MapPin className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span className="font-semibold text-slate-700 block truncate">
              {geoState.loading ? 'Acquiring GPS...' : geoState.locationName}
            </span>
            <span className="text-[11px] text-slate-500 block">
              {geoState.latitude && geoState.longitude
                ? `GPS: ${geoState.latitude.toFixed(5)}, ${geoState.longitude.toFixed(5)} (${geoState.accuracy ? `±${Math.round(geoState.accuracy)}m accuracy` : 'Verified'})`
                : geoState.error || 'Please allow location permission for verified premises tagging.'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={requestLocation}
          disabled={geoState.loading}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white transition-all shrink-0 border border-transparent hover:border-slate-300"
          title="Refresh GPS Coordinates"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${geoState.loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2.5 transition-all animate-in fade-in slide-in-from-top-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Punch Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Check-In Card */}
        <div className={`p-4 rounded-xl border transition-all ${isCheckedIn ? 'bg-emerald-50/60 border-emerald-200' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <LogIn className="w-3.5 h-3.5 text-emerald-600" /> Morning Check-In
            </span>
            {isCheckedIn && (
              <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                Punched
              </span>
            )}
          </div>
          <div className="text-xl font-bold font-mono text-slate-800 mb-3">
            {punchStatus?.inTime || '--:--'}
          </div>

          <button
            type="button"
            onClick={() => handlePunch('IN')}
            disabled={submitting}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
              isCheckedIn
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/20 active:scale-[0.98]'
            }`}
          >
            <LogIn className="w-4 h-4" />
            {submitting ? 'Recording...' : isCheckedIn ? 'Re-Punch In' : 'Check In (Punch IN)'}
          </button>
        </div>

        {/* Check-Out Card */}
        <div className={`p-4 rounded-xl border transition-all ${isCheckedOut ? 'bg-sky-50/60 border-sky-200' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <LogOut className="w-3.5 h-3.5 text-[#1184b0]" /> Evening Check-Out
            </span>
            {isCheckedOut && (
              <span className="text-[10px] font-bold bg-sky-200 text-[#011638] px-2 py-0.5 rounded-full">
                Punched
              </span>
            )}
          </div>
          <div className="text-xl font-bold font-mono text-slate-800 mb-3">
            {punchStatus?.outTime || '--:--'}
          </div>

          <button
            type="button"
            onClick={() => handlePunch('OUT')}
            disabled={submitting}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
              isCheckedOut
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                : isCheckedIn
                ? 'bg-gradient-to-r from-[#1184b0] to-[#011638] hover:opacity-95 text-white shadow-[#1184b0]/20 active:scale-[0.98]'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <LogOut className="w-4 h-4" />
            {submitting ? 'Recording...' : isCheckedOut ? 'Re-Punch Out' : 'Check Out (Punch OUT)'}
          </button>
        </div>

        {/* Shift Summary & Status */}
        <div className="p-4 rounded-xl bg-slate-900 text-white shadow-md flex flex-col justify-between h-full min-h-[140px]">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Today's Total Work</span>
              <span className="text-amber-400 font-semibold">{punchStatus?.statusLabel || 'Pending'}</span>
            </div>
            <div className="text-2xl font-mono font-extrabold text-white mb-1">
              {punchStatus?.workTime ? `${punchStatus.workTime} hrs` : '00:00 hrs'}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Employee Code:</span>
            <span className="font-semibold text-slate-200">#{empCode}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
