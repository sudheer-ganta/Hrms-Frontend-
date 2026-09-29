import axios from 'axios';
import { 
  AttendanceResponse, 
  DashboardStats, 
  AttendanceSource, 
  SyncLogsResponse, 
  SyncResult, 
  SyncAllResponse, 
  InOutResponse, 
  EmployeeTimesheet, 
  HRMSPolicySettings, 
  CompanyHoliday, 
  SchedulerStatus,
  EmployeeProfile,
  EmployeePayrollSummary,
  SendPayslipResponse,
  AttendanceRegularizationRequest,
  LeaveBalance,
  PayrollRunStatus
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the logged-in user's token to every request when one exists, so
// role-gated endpoints (like closing payroll) work without every caller
// having to remember to pass it manually.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('etimehr_auth_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Sources
  getSources: async (): Promise<AttendanceSource[]> => {
    const res = await apiClient.get<{ success: boolean; data: AttendanceSource[] }>('/sources');
    return res.data.data;
  },

  // Dashboard Stats
  getDashboardStats: async (params?: { date?: string; sourceId?: string }): Promise<DashboardStats> => {
    const res = await apiClient.get<{ success: boolean; data: DashboardStats }>('/attendance/stats', { params });
    return res.data.data;
  },

  // API 3: Processed Daily IN/OUT Attendance & Work Hours
  getInOutAttendance: async (params: {
    sourceId?: string;
    fromDate?: string;
    toDate?: string;
    employeeCode?: string;
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<InOutResponse> => {
    const res = await apiClient.get<InOutResponse>('/attendance/in-out', { params });
    return res.data;
  },

  // API 3: Employee Timesheet Matrix
  getTimesheet: async (params: {
    sourceId?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
  }): Promise<{ success: boolean; data: EmployeeTimesheet[] }> => {
    const res = await apiClient.get<{ success: boolean; data: EmployeeTimesheet[] }>('/attendance/timesheet', { params });
    return res.data;
  },

  // API 2: Raw Attendance Records
  getAttendance: async (params: {
    sourceId?: string;
    fromDate?: string;
    toDate?: string;
    employeeCode?: string;
    search?: string;
    machineId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<AttendanceResponse> => {
    const res = await apiClient.get<AttendanceResponse>('/attendance', { params });
    return res.data;
  },

  // Raw Swipes
  getRawSwipes: async (params: {
    sourceId?: string;
    fromDate?: string;
    toDate?: string;
    employeeCode?: string;
    search?: string;
    machineId?: string;
    page?: number;
    limit?: number;
  }): Promise<AttendanceResponse> => {
    const res = await apiClient.get<AttendanceResponse>('/attendance/raw-swipes', { params });
    return res.data;
  },

  // Employee Geo-Punch (Check-In & Check-Out with Server IST Enforcement)
  getTodayPunchStatus: async (empCode?: string): Promise<any> => {
    const res = await apiClient.get<{ success: boolean; data: any }>('/attendance/punch/today', {
      params: empCode ? { empCode } : {},
    });
    return res.data.data;
  },

  recordPunch: async (payload: {
    empCode?: string;
    punchType?: 'IN' | 'OUT' | 'AUTO';
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    address?: string;
    notes?: string;
  }): Promise<any> => {
    const res = await apiClient.post<{ success: boolean; data: any; message: string }>('/attendance/punch', payload);
    return res.data;
  },

  // API 2 Sync
  syncSource: async (
    sourceId: string,
    payload?: { fromDate?: string; toDate?: string; empCode?: string }
  ): Promise<SyncResult> => {
    const res = await apiClient.post<SyncResult>(`/sync/${sourceId}`, payload || {});
    return res.data;
  },

  syncAllSources: async (payload?: {
    fromDate?: string;
    toDate?: string;
    empCode?: string;
  }): Promise<SyncAllResponse> => {
    const res = await apiClient.post<SyncAllResponse>('/sync/all', payload || {});
    return res.data;
  },

  // API 3 Sync (IN/OUT Punch Data)
  syncInOutSource: async (
    sourceId: string,
    payload?: { fromDate?: string; toDate?: string; empCode?: string }
  ) => {
    const res = await apiClient.post(`/sync/in-out/${sourceId}`, payload || {});
    return res.data;
  },

  syncAllInOutSources: async (payload?: {
    fromDate?: string;
    toDate?: string;
    empCode?: string;
  }) => {
    const res = await apiClient.post('/sync/in-out/all', payload || {});
    return res.data;
  },

  // Sync Logs
  getSyncLogs: async (params: {
    sourceId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<SyncLogsResponse> => {
    const res = await apiClient.get<SyncLogsResponse>('/sync/logs', { params });
    return res.data;
  },

  // Policy, Shifts & Holidays
  getPolicySettings: async (): Promise<HRMSPolicySettings> => {
    const res = await apiClient.get<{ success: boolean; data: HRMSPolicySettings }>('/settings');
    return res.data.data;
  },

  updatePolicySettings: async (payload: Partial<HRMSPolicySettings>): Promise<HRMSPolicySettings> => {
    const res = await apiClient.put<{ success: boolean; data: HRMSPolicySettings }>('/settings', payload);
    return res.data.data;
  },

  addHoliday: async (holiday: { date: string; name: string; type?: string }): Promise<CompanyHoliday> => {
    const res = await apiClient.post<{ success: boolean; data: CompanyHoliday }>('/settings/holidays', holiday);
    return res.data.data;
  },

  removeHoliday: async (id: string): Promise<void> => {
    await apiClient.delete(`/settings/holidays/${id}`);
  },

  // Auto-Sync Scheduler
  getSchedulerStatus: async (): Promise<SchedulerStatus> => {
    const res = await apiClient.get<{ success: boolean; data: SchedulerStatus }>('/sync/scheduler/status');
    return res.data.data;
  },

  toggleScheduler: async (payload?: { enabled?: boolean; intervalMinutes?: number }): Promise<SchedulerStatus> => {
    const res = await apiClient.post<{ success: boolean; data: SchedulerStatus }>('/sync/scheduler/toggle', payload || {});
    return res.data.data;
  },

  triggerSchedulerNow: async (): Promise<any> => {
    const res = await apiClient.post('/sync/scheduler/trigger-now');
    return res.data;
  },

  // Employee Master & Profiles (SuperAdmin / HR)
  getAllEmployees: async (): Promise<EmployeeProfile[]> => {
    const res = await apiClient.get<{ success: boolean; data: EmployeeProfile[] }>('/employees');
    return res.data.data;
  },

  getEmployeeProfile: async (empCode: string): Promise<EmployeeProfile> => {
    const res = await apiClient.get<{ success: boolean; data: EmployeeProfile }>(`/employees/${empCode}`);
    return res.data.data;
  },

  updateEmployeeProfile: async (empCode: string, payload: Partial<EmployeeProfile>): Promise<EmployeeProfile> => {
    const res = await apiClient.put<{ success: boolean; data: EmployeeProfile }>(`/employees/${empCode}`, payload);
    return res.data.data;
  },

  // Payroll & Overtime Engine
  getEmployeePayroll: async (empCode: string, month?: string): Promise<EmployeePayrollSummary> => {
    const res = await apiClient.get<{ success: boolean; data: EmployeePayrollSummary }>(`/payroll/employee/${empCode}`, {
      params: { month }
    });
    return res.data.data;
  },

  getAllPayroll: async (month?: string): Promise<EmployeePayrollSummary[]> => {
    const res = await apiClient.get<{ success: boolean; data: EmployeePayrollSummary[] }>('/payroll/all', {
      params: { month }
    });
    return res.data.data;
  },

  // Payroll & Overtime Adjustments
  getPayrollAdjustments: async (
    month: string
  ): Promise<Record<string, { otHours?: number; totalWorkHours?: number; multiplier?: number; sundayDays?: number }>> => {
    const res = await apiClient.get<{
      success: boolean;
      data: Record<string, { otHours?: number; totalWorkHours?: number; multiplier?: number; sundayDays?: number }>;
    }>(`/payroll/adjustments/${month}`);
    return res.data.data || {};
  },

  savePayrollAdjustments: async (
    month: string,
    adjustments: Record<string, { otHours?: number; totalWorkHours?: number; multiplier?: number; sundayDays?: number }>
  ): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/payroll/adjustments/${month}`, {
      adjustments,
    });
    return res.data;
  },

  // Prices UNSAVED OT Calculator edits through the backend payroll engine (nothing is persisted).
  previewPayroll: async (
    month: string,
    adjustments: Record<string, { otHours?: number; totalWorkHours?: number; multiplier?: number; sundayDays?: number }>
  ): Promise<EmployeePayrollSummary[]> => {
    const res = await apiClient.post<{ success: boolean; data: EmployeePayrollSummary[] }>(`/payroll/preview/${month}`, {
      adjustments,
    });
    return res.data.data;
  },

  clearPayrollAdjustments: async (month: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/payroll/adjustments/${month}`);
    return res.data;
  },

  sendPayslipEmail: async (payload: {
    empCode: string;
    month?: string;
    recipientEmail?: string;
    customMessage?: string;
  }): Promise<SendPayslipResponse> => {
    const res = await apiClient.post<SendPayslipResponse>('/payroll/send-payslip', payload);
    return res.data;
  },

  // Monthly Payroll Closing
  getPayrollRunStatus: async (month: string): Promise<PayrollRunStatus> => {
    const res = await apiClient.get<{ success: boolean; data: PayrollRunStatus }>(`/payroll/runs/${month}`);
    return res.data.data;
  },

  listPayrollRuns: async (): Promise<PayrollRunStatus[]> => {
    const res = await apiClient.get<{ success: boolean; data: PayrollRunStatus[] }>('/payroll/runs');
    return res.data.data;
  },

  closePayrollMonth: async (month: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post(`/payroll/runs/${month}/close`);
    return res.data;
  },

  reopenPayrollMonth: async (month: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post(`/payroll/runs/${month}/reopen`);
    return res.data;
  },

  // ESS Requests & Regularization
  getRequests: async (params?: { empCode?: string; status?: string }): Promise<AttendanceRegularizationRequest[]> => {
    const res = await apiClient.get<{ success: boolean; data: AttendanceRegularizationRequest[] }>('/requests', { params });
    return res.data.data;
  },

  createRequest: async (payload: {
    empCode: string;
    empName?: string;
    requestType: 'MISSED_PUNCH' | 'LEAVE' | 'WORK_FROM_HOME' | 'ON_DUTY';
    date: string;
    inTime?: string;
    outTime?: string;
    leaveType?: 'CASUAL_LEAVE' | 'SICK_LEAVE' | 'EARNED_LEAVE';
    reason: string;
  }): Promise<AttendanceRegularizationRequest> => {
    const res = await apiClient.post<{ success: boolean; data: AttendanceRegularizationRequest }>('/requests', payload);
    return res.data.data;
  },

  updateRequestStatus: async (id: string, status: 'APPROVED' | 'REJECTED', reviewComment?: string, reviewedBy?: string): Promise<AttendanceRegularizationRequest> => {
    const res = await apiClient.patch<{ success: boolean; data: AttendanceRegularizationRequest }>(`/requests/${id}/status`, {
      status,
      reviewComment,
      reviewedBy,
    });
    return res.data.data;
  },

  getLeaveBalance: async (empCode: string): Promise<LeaveBalance> => {
    const res = await apiClient.get<{ success: boolean; data: LeaveBalance }>(`/requests/balance/${empCode}`);
    return res.data.data;
  },

  // Backend Health
  getHealth: async (): Promise<{ status: string; database: { connected: boolean } }> => {
    const res = await apiClient.get('/health');
    return res.data;
  },

  // Auth & User Management
  login: async (identifier: string, password: string):Promise<{ token: string; user: any }> => {
    const res = await apiClient.post<{ success: boolean; data: { token: string; user: any }; message?: string }>('/auth/login', {
      identifier,
      password,
    });
    return res.data.data;
  },

  getMe: async (): Promise<any> => {
    const res = await apiClient.get<{ success: boolean; data: any }>('/auth/me');
    return res.data.data;
  },

  getUsers: async (): Promise<any[]> => {
    const res = await apiClient.get<{ success: boolean; data: any[] }>('/auth/users');
    return res.data.data;
  },

  createUser: async (payload: any): Promise<any> => {
    const res = await apiClient.post<{ success: boolean; data: any; message?: string }>('/auth/users', payload);
    return res.data.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/auth/users/${id}`);
  },

  toggleUserStatus: async (id: string): Promise<any> => {
    const res = await apiClient.post<{ success: boolean; data: any }>(`/auth/users/${id}/toggle-status`);
    return res.data.data;
  },

  resetUserPassword: async (id: string, newPassword: string): Promise<void> => {
    await apiClient.post(`/auth/users/${id}/reset-password`, { newPassword });
  },
};
