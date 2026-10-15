import axios from 'axios';
import { notifyDataChanged } from './dataSync';
import { normalizeError } from '../lib/apiError';
import type {
  AttendanceCalendar, AttendanceDay, AttendanceDaysResponse, AttendanceRegularizationRequest, AttendanceSource, AttendanceStatus,
  CompanyHoliday, CreateRequestInput, DashboardStats, EmployeePayrollSummary, EmployeeProfile, EmployeeProfileInput,
  AttendanceCoverage, HRMSPolicySettings, HealthStatus, LeaveBalance, LeaveType, OtAdjustments, Pagination, PayrollRunStatus, PolicyUpdate, PunchResult,
  PunchStatus, RawPunchResponse, SalaryBreakdown, SchedulerStatus, SendPayslipResponse, Site, SyncAllResult, SyncLogsResponse,
  SyncResult, TimesheetEmployee,
} from '../types';
import type { AuthResponse, CreateUserInput, User } from '../types/auth.types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
export const TOKEN_STORAGE_KEY = 'etimehr_auth_token';
export const USER_STORAGE_KEY = 'etimehr_auth_user';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 45000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  let token: string | null = null;
  try { token = localStorage.getItem(TOKEN_STORAGE_KEY); } catch { /* storage unavailable */ }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => {
    const method = (res.config?.method || 'get').toLowerCase();
    const url = res.config?.url || '';
    // Writes change shared data; previews and login do not.
    if (method !== 'get' && !url.includes('/payroll/preview') && !url.includes('/salary-preview') && !url.includes('/auth/login')) {
      notifyDataChanged();
    }
    return res;
  },
  (error) => {
    const url: string = error?.config?.url || '';
    const n = normalizeError(error);
    // Only an authentication failure ends the session (a 403 is a permission problem, not a logout).
    if (n.status === 401 && n.code === 'UNAUTHENTICATED' && !url.includes('/auth/login')) {
      try { localStorage.removeItem(TOKEN_STORAGE_KEY); localStorage.removeItem(USER_STORAGE_KEY); } catch { /* ignore */ }
      if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

type Envelope<T> = { success: true; data: T };
const get = async <T>(url: string, params?: object): Promise<T> => (await apiClient.get<Envelope<T>>(url, { params })).data.data;
const post = async <T>(url: string, body?: object): Promise<T> => (await apiClient.post<Envelope<T>>(url, body ?? {})).data.data;
const put = async <T>(url: string, body?: object): Promise<T> => (await apiClient.put<Envelope<T>>(url, body ?? {})).data.data;
const patch = async <T>(url: string, body?: object): Promise<T> => (await apiClient.patch<Envelope<T>>(url, body ?? {})).data.data;
const del = async <T>(url: string): Promise<T> => (await apiClient.delete<Envelope<T>>(url)).data.data;

export interface DayQuery {
  siteId?: string;
  fromDate?: string;
  toDate?: string;
  employeeCode?: string;
  search?: string;
  status?: AttendanceStatus;
  page?: number;
  limit?: number;
}

export const api = {
  // ---- auth
  login: (identifier: string, password: string) => post<AuthResponse>('/auth/login', { identifier, password }),
  getMe: () => get<User>('/auth/me'),
  logout: () => post<{ loggedOut: boolean }>('/auth/logout'),
  changePassword: (currentPassword: string, newPassword: string) => post<AuthResponse>('/auth/change-password', { currentPassword, newPassword }),
  getUsers: () => get<User[]>('/auth/users'),
  createUser: (payload: CreateUserInput) => post<User>('/auth/users', payload),
  deleteUser: (id: string) => del<{ deleted: boolean }>(`/auth/users/${id}`),
  toggleUserStatus: (id: string) => post<User>(`/auth/users/${id}/toggle-status`),
  resetUserPassword: (id: string, newPassword: string) => post<{ reset: boolean }>(`/auth/users/${id}/reset-password`, { newPassword }),

  // ---- sites & sources
  getSources: () => get<AttendanceSource[]>('/sources'),
  getSites: () => get<Site[]>('/sources/sites'),
  updateSite: (siteId: string, payload: Partial<Pick<Site, 'displayName' | 'active'>> & { geo?: Site['geo'] | null }) => put<Site>(`/sources/sites/${siteId}`, payload),

  // ---- attendance (one resolver, one verdict per employee-day)
  getDashboardStats: (params?: { date?: string; siteId?: string }) => get<DashboardStats>('/attendance/stats', params),
  getAttendanceDays: async (params: DayQuery): Promise<AttendanceDaysResponse> => (await apiClient.get<AttendanceDaysResponse>('/attendance/days', { params })).data,
  getAttendanceCalendar: (month: string, employeeCode: string) => get<AttendanceCalendar>('/attendance/calendar', { month, employeeCode }),
  getTimesheet: (params: { siteId?: string; fromDate: string; toDate: string; search?: string }) => get<TimesheetEmployee[]>('/attendance/timesheet', params),
  getRawPunches: async (params: { sourceId?: string; fromDate?: string; toDate?: string; employeeCode?: string; search?: string; machineId?: string; origin?: 'DEVICE' | 'ESS_WEB'; page?: number; limit?: number }): Promise<RawPunchResponse> =>
    (await apiClient.get<RawPunchResponse>('/attendance/raw-swipes', { params })).data,
  getTodayPunchStatus: (empCode?: string) => get<PunchStatus>('/attendance/punch/today', empCode ? { empCode } : undefined),
  recordPunch: (payload: { empCode?: string; punchType?: 'IN' | 'OUT' | 'AUTO'; latitude?: number; longitude?: number; accuracy?: number; address?: string; override?: boolean }) => post<PunchResult>('/attendance/punch', payload),
  recomputeAttendance: (payload: { fromDate: string; toDate: string; employeeCode?: string }) => post<{ recomputed: number; months: string[] }>('/attendance/recompute', payload),
  adjustAttendanceDay: (payload: { employeeCode: string; businessDate: string; kind: 'WORK_FROM_HOME' | 'MISSED_PUNCH' | 'LEAVE' | 'ON_DUTY'; reason: string; inTime?: string; outTime?: string; leaveType?: LeaveType; paid?: boolean; fraction?: number }) =>
    post<AttendanceDay>('/attendance/adjust', payload),
  revokeAttendanceAdjustment: (payload: { id?: string; employeeCode?: string; businessDate?: string; reason?: string }) =>
    payload.id ? post<AttendanceDay>(`/attendance/adjust/${payload.id}/revoke`, { reason: payload.reason }) : post<AttendanceDay>('/attendance/adjust/revoke', payload),

  // ---- sync (same result shape for raw and IN/OUT)
  syncSource: (sourceId: string, payload?: { fromDate?: string; toDate?: string; empCode?: string }) => post<SyncResult>(`/sync/${sourceId}`, payload),
  syncAllSources: (payload?: { fromDate?: string; toDate?: string; empCode?: string }) => post<SyncAllResult>('/sync/all', payload),
  syncInOutSource: (sourceId: string, payload?: { fromDate?: string; toDate?: string; empCode?: string }) => post<SyncResult>(`/sync/in-out/${sourceId}`, payload),
  syncAllInOutSources: (payload?: { fromDate?: string; toDate?: string; empCode?: string }) => post<SyncAllResult>('/sync/in-out/all', payload),
  getSyncLogs: async (params: { sourceId?: string; status?: string; syncType?: string; page?: number; limit?: number }): Promise<SyncLogsResponse> =>
    (await apiClient.get<SyncLogsResponse>('/sync/logs', { params })).data,
  getSchedulerStatus: () => get<SchedulerStatus>('/sync/scheduler/status'),
  toggleScheduler: (payload?: { enabled?: boolean; intervalMinutes?: number }) => post<SchedulerStatus>('/sync/scheduler/toggle', payload),
  triggerSchedulerNow: () => post<SchedulerStatus['lastRunResult']>('/sync/scheduler/trigger-now'),

  // ---- policy
  getPolicySettings: () => get<HRMSPolicySettings>('/settings'),
  updatePolicySettings: (payload: PolicyUpdate) => put<HRMSPolicySettings>('/settings', payload),
  addHoliday: (holiday: { date: string; name: string; type?: CompanyHoliday['type']; paid?: boolean }) => post<CompanyHoliday>('/settings/holidays', holiday),
  removeHoliday: (id: string) => del<{ removed: boolean }>(`/settings/holidays/${id}`),

  // ---- employees
  getAllEmployees: () => get<EmployeeProfile[]>('/employees'),
  getEmployeeProfile: (empCode: string) => get<EmployeeProfile>(`/employees/${encodeURIComponent(empCode)}`),
  updateEmployeeProfile: (empCode: string, payload: EmployeeProfileInput) => put<EmployeeProfile>(`/employees/${encodeURIComponent(empCode)}`, payload),
  previewSalary: (payload: EmployeeProfileInput) => post<SalaryBreakdown>('/employees/salary-preview', payload),

  // ---- payroll (display only: every figure is computed by the backend)
  getEmployeePayroll: (empCode: string, month?: string) => get<EmployeePayrollSummary>(`/payroll/employee/${encodeURIComponent(empCode)}`, month ? { month } : undefined),
  getAllPayroll: (month?: string) => get<EmployeePayrollSummary[]>('/payroll/all', month ? { month } : undefined),
  getPayrollAdjustments: (month: string) => get<OtAdjustments>(`/payroll/adjustments/${month}`),
  savePayrollAdjustments: (month: string, adjustments: OtAdjustments, reason?: string) => post<OtAdjustments>(`/payroll/adjustments/${month}`, { adjustments, ...(reason ? { reason } : {}) }),
  previewPayroll: (month: string, adjustments: OtAdjustments) => post<EmployeePayrollSummary[]>(`/payroll/preview/${month}`, { adjustments }),
  clearPayrollAdjustments: (month: string) => del<{ cleared: boolean }>(`/payroll/adjustments/${month}`),
  sendPayslipEmail: (payload: { empCode: string; month: string; recipientEmail?: string }) => post<SendPayslipResponse>('/payroll/send-payslip', payload),
  getPayrollRunStatus: (month: string) => get<PayrollRunStatus>(`/payroll/runs/${month}`),
  listPayrollRuns: () => get<PayrollRunStatus[]>('/payroll/runs'),
  getPayrollCoverage: (month: string) => get<AttendanceCoverage>(`/payroll/runs/${month}/coverage`),
  closePayrollMonth: (month: string, acknowledgeMissingAttendance = false) =>
    post<PayrollRunStatus>(`/payroll/runs/${month}/close`, acknowledgeMissingAttendance ? { acknowledgeMissingAttendance: true } : {}),
  reopenPayrollMonth: (month: string, reason: string) => post<PayrollRunStatus>(`/payroll/runs/${month}/reopen`, { reason }),

  // ---- requests (PENDING → APPROVED → APPLIED; explicit revoke)
  getRequests: (params?: { empCode?: string; status?: string }) => get<AttendanceRegularizationRequest[]>('/requests', params),
  createRequest: (payload: CreateRequestInput & { empCode?: string }) => post<AttendanceRegularizationRequest>('/requests', payload),
  approveRequest: (id: string, reviewComment?: string) => patch<AttendanceRegularizationRequest>(`/requests/${id}/status`, { status: 'APPROVED', reviewComment }),
  rejectRequest: (id: string, reviewComment?: string) => patch<AttendanceRegularizationRequest>(`/requests/${id}/status`, { status: 'REJECTED', reviewComment }),
  cancelRequest: (id: string) => post<AttendanceRegularizationRequest>(`/requests/${id}/cancel`),
  revokeRequest: (id: string, reason: string) => post<AttendanceRegularizationRequest>(`/requests/${id}/revoke`, { reason }),
  retryApplyRequest: (id: string) => post<AttendanceRegularizationRequest>(`/requests/${id}/apply`),
  getLeaveBalance: (empCode: string, year?: number) => get<LeaveBalance>(`/requests/balance/${encodeURIComponent(empCode)}`, year ? { year } : undefined),

  // ---- health
  getHealth: async (): Promise<HealthStatus> => (await apiClient.get<Envelope<HealthStatus>>('/health')).data.data,
};

export type { Pagination };
