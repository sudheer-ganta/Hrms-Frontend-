import React, { useState } from 'react';
import { X, Calendar, Clock, Home, Building, Palmtree, CheckCircle2, RotateCcw, AlertTriangle, LogIn, LogOut, Check } from 'lucide-react';
import { AttendanceDay, LeaveType } from '../../types';
import { api } from '../../services/api';
import { notifyDataChanged } from '../../services/dataSync';
import { formatMinutes, metaFor } from '../../lib/attendanceDisplay';
import { formatBusinessDate, formatBusinessDay } from '../../lib/businessDate';
import { errorMessage } from '../../lib/apiError';
import { useAuth } from '../../context/AuthContext';

interface DayAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: AttendanceDay | null;
  onSaved?: () => void;
}

const LEAVE_TYPES: { type: LeaveType; label: string }[] = [
  { type: 'CASUAL_LEAVE', label: 'Casual Leave (CL)' },
  { type: 'SICK_LEAVE', label: 'Sick Leave (SL)' },
  { type: 'EARNED_LEAVE', label: 'Earned Leave (EL)' },
  { type: 'COMP_OFF', label: 'Comp Off' },
  { type: 'UNPAID_LEAVE', label: 'Unpaid Leave (LWP)' },
];

export const DayAdjustmentModal: React.FC<DayAdjustmentModalProps> = ({
  isOpen,
  onClose,
  day,
  onSaved,
}) => {
  const { isEmployee } = useAuth();
  const [activeAction, setActiveAction] = useState<'WFH' | 'LEAVE' | 'MISSED_PUNCH' | 'ON_DUTY'>('WFH');
  const [reason, setReason] = useState('Approved Work From Home');
  const [leaveType, setLeaveType] = useState<LeaveType>('CASUAL_LEAVE');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [inTime, setInTime] = useState('09:30');
  const [outTime, setOutTime] = useState('18:30');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen || !day) return null;

  const meta = metaFor(day.status);

  const handleActionChange = (action: 'WFH' | 'LEAVE' | 'MISSED_PUNCH' | 'ON_DUTY') => {
    setActiveAction(action);
    setError(null);
    if (action === 'WFH') setReason('Approved Work From Home');
    else if (action === 'LEAVE') setReason('Approved Paid Leave');
    else if (action === 'MISSED_PUNCH') setReason('Biometric machine punch regularized');
    else if (action === 'ON_DUTY') setReason('Official client visit / on-duty assignment');
  };

  const handleApplyAdjustment = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for the adjustment.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (activeAction === 'WFH') {
        await api.adjustAttendanceDay({
          employeeCode: day.employeeCode,
          businessDate: day.businessDate,
          kind: 'WORK_FROM_HOME',
          reason: reason.trim(),
        });
      } else if (activeAction === 'LEAVE') {
        await api.adjustAttendanceDay({
          employeeCode: day.employeeCode,
          businessDate: day.businessDate,
          kind: 'LEAVE',
          leaveType,
          paid: leaveType !== 'UNPAID_LEAVE',
          fraction: isHalfDay ? 0.5 : 1,
          reason: reason.trim(),
        });
      } else if (activeAction === 'MISSED_PUNCH') {
        if (!inTime || !outTime) {
          setError('Please provide valid Check-In and Check-Out times.');
          setLoading(false);
          return;
        }
        await api.adjustAttendanceDay({
          employeeCode: day.employeeCode,
          businessDate: day.businessDate,
          kind: 'MISSED_PUNCH',
          inTime,
          outTime,
          reason: reason.trim(),
        });
      } else if (activeAction === 'ON_DUTY') {
        await api.adjustAttendanceDay({
          employeeCode: day.employeeCode,
          businessDate: day.businessDate,
          kind: 'ON_DUTY',
          reason: reason.trim(),
        });
      }

      setSuccess(`Successfully updated ${day.businessDate} to ${activeAction === 'WFH' ? 'Work From Home' : activeAction}!`);
      notifyDataChanged();
      onSaved?.();
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      setError(errorMessage(err, 'Failed to apply attendance adjustment'));
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAdjustment = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.revokeAttendanceAdjustment({
        id: day.adjustmentId ?? undefined,
        employeeCode: day.employeeCode,
        businessDate: day.businessDate,
        reason: 'Revoked by administrator to restore system calculation',
      });
      setSuccess(`Restored default attendance calculation for ${day.businessDate}.`);
      notifyDataChanged();
      onSaved?.();
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      setError(errorMessage(err, 'Failed to revoke adjustment'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-sky-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-slate-900 text-base">
                {formatBusinessDay(day.businessDate)}
              </h3>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                <span className="font-bold text-brand-600">{day.employeeName}</span>
                <span>•</span>
                <span className="font-mono font-bold text-slate-600">ID: {day.employeeCode}</span>
                {day.siteName && (
                  <>
                    <span>•</span>
                    <span>{day.siteName}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-700">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {/* Current Day Status Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Current Attendance Status</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${meta.badge}`}>
                {day.statusLabel || 'Upcoming'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 text-center">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block flex items-center justify-center gap-1">
                  <LogIn className="w-3 h-3 text-emerald-600" /> Check-In
                </span>
                <span className="font-mono font-bold text-slate-800 mt-1 block text-sm">
                  {day.firstIn || '--:--'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 text-center">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block flex items-center justify-center gap-1">
                  <LogOut className="w-3 h-3 text-cyan-600" /> Check-Out
                </span>
                <span className="font-mono font-bold text-slate-800 mt-1 block text-sm">
                  {day.lastOut || '--:--'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 text-center">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-brand-500" /> Duration
                </span>
                <span className="font-mono font-bold text-brand-600 mt-1 block text-sm">
                  {formatMinutes(day.workMinutes)}
                </span>
              </div>
            </div>

            {day.manualOverride && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-3">
                <div className="text-[11px] text-indigo-900 font-medium">
                  <strong>Manual override active</strong>: This day was manually modified from system calculation.
                </div>
                {!isEmployee && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleRevokeAdjustment}
                    className="shrink-0 px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold rounded-xl shadow-xs flex items-center gap-1 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Action Options (For HR / Admin or converting Absent -> WFH) */}
          {!isEmployee ? (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 font-heading">
                  Change Status / Regularize this Day:
                </label>
              </div>

              {/* Action Tabs */}
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-2xl">
                {[
                  { id: 'WFH', label: 'WFH', icon: Home, color: 'text-teal-600' },
                  { id: 'LEAVE', label: 'Leave', icon: Palmtree, color: 'text-sky-600' },
                  { id: 'MISSED_PUNCH', label: 'Punch', icon: Clock, color: 'text-amber-600' },
                  { id: 'ON_DUTY', label: 'On Duty', icon: Building, color: 'text-indigo-600' },
                ].map((act) => {
                  const Icon = act.icon;
                  const isSelected = activeAction === act.id;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => handleActionChange(act.id as any)}
                      className={`py-2 px-1 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all ${
                        isSelected
                          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? act.color : 'text-slate-400'}`} />
                      <span className="text-[11px]">{act.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Action Form Details */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                {activeAction === 'WFH' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-teal-800 font-bold text-xs">
                      <Home className="w-4 h-4 text-teal-600" />
                      <span>Mark as Work From Home (WFH)</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Credits <strong>1.0 full payable day</strong> in payroll and attendance records.
                    </p>
                  </div>
                )}

                {activeAction === 'LEAVE' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Leave Type</label>
                      <select
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        {LEAVE_TYPES.map((lt) => (
                          <option key={lt.type} value={lt.type}>{lt.label}</option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isHalfDay}
                        onChange={(e) => setIsHalfDay(e.target.checked)}
                        className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                      />
                      <span>Half Day Leave (0.5 payable day)</span>
                    </label>
                  </div>
                )}

                {activeAction === 'MISSED_PUNCH' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Check-In Time</label>
                        <input
                          type="time"
                          value={inTime}
                          onChange={(e) => setInTime(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Check-Out Time</label>
                        <input
                          type="time"
                          value={outTime}
                          onChange={(e) => setOutTime(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Regularizes missing biometric punch to calculate work hours and presence.
                    </p>
                  </div>
                )}

                {activeAction === 'ON_DUTY' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs">
                      <Building className="w-4 h-4 text-indigo-600" />
                      <span>Mark as On Duty (OD)</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Credits full presence for client visits, field work, or company business.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Reason / Note</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide reason for this override..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200/80 space-y-2">
              <span className="text-xs font-bold text-sky-900 block">Need to regularize this day?</span>
              <p className="text-[11px] text-sky-700">
                You can apply for Leave, Missed Punch regularization, or Work From Home directly from the Requests tab or Quick Actions in your portal.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition"
          >
            Close
          </button>

          {!isEmployee && (
            <button
              type="button"
              disabled={loading}
              onClick={handleApplyAdjustment}
              className="px-5 py-2.5 bg-gradient-to-r from-[#011638] via-[#093554] to-[#1184b0] hover:opacity-95 text-white text-xs font-heading font-extrabold rounded-xl shadow-md flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <span>Applying…</span>
              ) : (
                <>
                  <Check className="w-4 h-4 text-sky-300" />
                  <span>
                    {activeAction === 'WFH' ? 'Change to WFH' : `Apply ${activeAction}`}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
