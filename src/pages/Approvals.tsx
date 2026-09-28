import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  User,
  Calendar,
  Search,
  Filter,
  AlertCircle,
  Sparkles,
  Check,
  X,
  MessageSquare,
  ShieldCheck,
  Building2,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import { AttendanceRegularizationRequest, EmployeeProfile } from '../types';
import { useAuth } from '../context/AuthContext';

export const Approvals: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AttendanceRegularizationRequest[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filter & Search States
  const [statusTab, setStatusTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'LEAVE' | 'MISSED_PUNCH'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<AttendanceRegularizationRequest | null>(null);
  const [rejectComment, setRejectComment] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reqs, emps] = await Promise.all([
        api.getRequests(),
        api.getAllEmployees().catch(() => [] as EmployeeProfile[]),
      ]);
      setRequests(reqs);
      setEmployees(emps);
    } catch (err) {
      console.error('Failed to load approvals data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (req: AttendanceRegularizationRequest) => {
    setIsProcessing(true);
    setActionError(null);
    try {
      const reviewerName = user?.name || (user?.role === 'FOUNDER' ? 'Founder' : 'Super Admin');
      await api.updateRequestStatus(req.id, 'APPROVED', undefined, reviewerName);
      setActionSuccess(`Request for ${req.empName} (${req.empCode}) approved & synchronized successfully!`);
      setTimeout(() => setActionSuccess(null), 4000);
      loadData();
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Failed to approve request');
      setTimeout(() => setActionError(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;

    setIsProcessing(true);
    setActionError(null);
    try {
      const reviewerName = user?.name || (user?.role === 'FOUNDER' ? 'Founder' : 'Super Admin');
      await api.updateRequestStatus(rejectTarget.id, 'REJECTED', rejectComment.trim() || undefined, reviewerName);
      setActionSuccess(`Request for ${rejectTarget.empName} has been rejected.`);
      setTimeout(() => setActionSuccess(null), 4000);
      setRejectTarget(null);
      setRejectComment('');
      loadData();
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Failed to reject request');
      setTimeout(() => setActionError(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Metrics
  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const pendingLeaves = requests.filter(r => r.status === 'PENDING' && r.requestType === 'LEAVE').length;
  const pendingPunches = requests.filter(r => r.status === 'PENDING' && r.requestType === 'MISSED_PUNCH').length;
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;

  // Filtered requests list
  const filteredRequests = requests.filter(r => {
    const matchesStatus = statusTab === 'ALL' || r.status === statusTab;
    const matchesType = typeFilter === 'ALL' || r.requestType === typeFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      r.empName.toLowerCase().includes(query) || 
      r.empCode.toLowerCase().includes(query) || 
      r.date.includes(query) ||
      (r.reason || '').toLowerCase().includes(query);

    return matchesStatus && matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#1184b0] to-[#011638] text-white flex items-center justify-center font-heading font-extrabold text-xl shadow-md shadow-brand-500/20">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-heading font-extrabold text-slate-900">
                Approvals & Leave Requests Hub
              </h1>
              {pendingCount > 0 && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                  {pendingCount} Pending Action
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Review and 1-click approve employee leave applications, missed punch regularizations, and on-duty requests.
            </p>
          </div>
        </div>
      </div>

      {/* Alert Banners */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 shadow-xs animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => setStatusTab('PENDING')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            statusTab === 'PENDING' 
              ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-300 ring-2 ring-amber-400/20 shadow-md' 
              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Pending</span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-heading font-extrabold text-amber-600">
              {pendingCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">Requests</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-2 font-medium">
            <span>{pendingLeaves} Leaves</span>
            <span>•</span>
            <span>{pendingPunches} Missed Swipes</span>
          </div>
        </div>

        <div 
          onClick={() => { setStatusTab('PENDING'); setTypeFilter('LEAVE'); }}
          className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs cursor-pointer hover:border-slate-300 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending Leaves</span>
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-heading font-extrabold text-sky-600">
              {pendingLeaves}
            </span>
            <span className="text-xs text-slate-500 font-medium">Applications</span>
          </div>
          <span className="text-xs text-slate-400 block mt-2 font-medium">CL, SL & EL requests</span>
        </div>

        <div 
          onClick={() => { setStatusTab('PENDING'); setTypeFilter('MISSED_PUNCH'); }}
          className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs cursor-pointer hover:border-slate-300 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending Swipes</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-heading font-extrabold text-emerald-600">
              {pendingPunches}
            </span>
            <span className="text-xs text-slate-500 font-medium">Regularizations</span>
          </div>
          <span className="text-xs text-slate-400 block mt-2 font-medium">Forgot punch corrections</span>
        </div>

        <div 
          onClick={() => setStatusTab('APPROVED')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            statusTab === 'APPROVED' 
              ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-300 ring-2 ring-emerald-400/20 shadow-md' 
              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Processed</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-heading font-extrabold text-emerald-600">
              {approvedCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">Approved / {rejectedCount} Rejected</span>
          </div>
          <span className="text-xs text-slate-400 block mt-2 font-medium">Updated in timesheet</span>
        </div>
      </div>

      {/* Search & Tabs Controls */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStatusTab('PENDING')}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-2 ${
              statusTab === 'PENDING'
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Pending</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              pendingCount > 0 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusTab('APPROVED')}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-2 ${
              statusTab === 'APPROVED'
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Approved</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
              {approvedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusTab('REJECTED')}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-2 ${
              statusTab === 'REJECTED'
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Rejected</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
              {rejectedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusTab('ALL')}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-2 ${
              statusTab === 'ALL'
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>All</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
              {requests.length}
            </span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 outline-none focus:border-brand-500 bg-white"
          >
            <option value="ALL">All Request Types</option>
            <option value="LEAVE">Leave Applications</option>
            <option value="MISSED_PUNCH">Missed Punch Swipes</option>
          </select>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee, ID, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 w-52 sm:w-72 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3.5">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading leave & regularization requests...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs bg-white rounded-2xl border border-dashed border-slate-200 shadow-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="font-heading font-bold text-slate-700 text-sm">All Clean! No Requests Found</p>
            <p className="text-slate-400 mt-1">There are no {statusTab.toLowerCase()} requests matching your filters.</p>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const empProfile = employees.find(e => e.empCode === req.empCode);
            const isLeave = req.requestType === 'LEAVE';
            const leaveLabel = req.leaveType === 'CASUAL_LEAVE' 
              ? 'Casual Leave (CL)' 
              : req.leaveType === 'SICK_LEAVE' 
              ? 'Sick Leave (SL)' 
              : req.leaveType === 'EARNED_LEAVE' 
              ? 'Earned Leave (EL)' 
              : 'Leave';

            return (
              <div 
                key={req.id} 
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-card transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-100 to-sky-50 text-slate-700 border border-slate-200 flex items-center justify-center font-heading font-bold text-sm shrink-0">
                    {req.empName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-heading font-bold text-slate-900 text-sm">{req.empName}</span>
                      <span className="text-[10px] font-mono font-bold text-brand-600 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-100">
                        ID: {req.empCode}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500">
                        • {empProfile?.department || 'Operations'}
                      </span>
                    </div>

                    {/* Request Details */}
                    <div className="flex flex-wrap items-center gap-2.5 mt-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isLeave
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {isLeave ? leaveLabel : 'Missed Swipe Regularization'}
                      </span>

                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {req.date}
                      </span>

                      {!isLeave && (req.inTime || req.outTime) && (
                        <span className="text-xs text-slate-600 font-mono bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                          In: {req.inTime || '--:--'} • Out: {req.outTime || '--:--'}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100/80 max-w-xl">
                      <span className="font-bold text-slate-700">Reason: </span>
                      <span>{req.reason}</span>
                    </div>

                    {req.reviewedBy && (
                      <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-2">
                        <span>Reviewed by: <strong className="text-slate-600">{req.reviewedBy}</strong></span>
                        {req.reviewedAt && <span>• {new Date(req.reviewedAt).toLocaleString('en-IN')}</span>}
                        {req.reviewComment && <span>• "{req.reviewComment}"</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Action Block */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {req.status === 'PENDING' ? (
                    <>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleApprove(req)}
                        className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setRejectTarget(req)}
                        className="py-2 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </>
                  ) : req.status === 'APPROVED' ? (
                    <span className="py-1.5 px-3.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Approved</span>
                    </span>
                  ) : (
                    <span className="py-1.5 px-3.5 rounded-xl bg-rose-100 text-rose-800 font-bold text-xs border border-rose-200 flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Rejected</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading font-bold text-slate-900 text-base flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-500" />
                <span>Reject Request</span>
              </h3>
              <button
                type="button"
                onClick={() => { setRejectTarget(null); setRejectComment(''); }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to reject the <strong>{rejectTarget.requestType.toLowerCase()}</strong> request for <strong>{rejectTarget.empName}</strong> on <strong>{rejectTarget.date}</strong>?
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 font-heading mb-1.5">
                  Rejection Reason / Comment (Optional)
                </label>
                <textarea
                  rows={3}
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="e.g. Incomplete documentation, please resubmit with approval from manager..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setRejectTarget(null); setRejectComment(''); }}
                  className="py-2 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-md shadow-rose-500/20"
                >
                  {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
