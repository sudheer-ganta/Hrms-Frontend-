export interface AttendanceSource {
  id: string;
  name: string;
  internalName?: string;
  status: 'connected' | 'credentials_missing' | 'failed' | 'running' | string;
  lastSync?: string | null;
}

export interface AttendanceRecord {
  _id: string;
  sourceId: string;
  sourceName: string;
  employeeCode: string;
  employeeName: string;
  punchDateTime: string;
  entryDate: string; // YYYY-MM-DD
  entryTime: string; // HH:mm:ss
  machineId: string;
  machineFlag?: string | null;
  syncedAt: string;
  vendorRecordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface InOutRecord {
  _id?: string;
  sourceId: string;
  sourceName: string;
  employeeCode: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  inTime: string; // "08:56" or "--:--"
  outTime: string; // "17:37" or "--:--"
  workTime: string; // "08:11"
  workMinutes: number;
  overTime: string;
  breakTime: string;
  lateIn: string;
  earlyOut: string;
  status: string; // P, P/2, A, W, H
  statusLabel?: string;
  remark: string;
  syncedAt: string;
  recordKey: string;
}

export interface InOutSummary {
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  halfDayCount: number;
  weeklyOffCount: number;
  totalWorkMinutes: number;
  avgWorkMinutes: number;
  totalOvertimeMinutes: number;
  lateArrivalsCount: number;
}

export interface InOutResponse {
  success: boolean;
  data: InOutRecord[];
  pagination: Pagination;
  summary: InOutSummary;
}

export interface EmployeeTimesheetDay {
  date: string;
  inTime: string;
  outTime: string;
  workTime: string;
  workMinutes: number;
  status: string;
  lateIn: string;
  overTime: string;
}

export interface EmployeeTimesheet {
  employeeCode: string;
  employeeName: string;
  sourceId: string;
  sourceName: string;
  days: Record<string, EmployeeTimesheetDay>;
  totalDaysPresent: number;
  totalDaysAbsent: number;
  totalWorkMinutes: number;
  totalOvertimeMinutes: number;
  avgHoursPerDay: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AttendanceResponse {
  success: boolean;
  data: AttendanceRecord[];
  pagination: Pagination;
}

export interface LocationBreakdown {
  sourceId: string;
  sourceName: string;
  totalWorkforce?: number;
  presentCount?: number;
  absentCount?: number;
  attendanceRate?: number;
  totalPunches: number;
  todayPunches: number;
  activeEmployeesToday: number;
  lastSyncStatus: string;
  lastSyncAt: string | null;
}

export interface HourlyPunchDistribution {
  hour: string;
  punches: number;
  label: string;
}

export interface AttendanceStatusBreakdown {
  present: number;
  absent: number;
  halfDay: number;
  weeklyOff: number;
  total: number;
  presentPct: number;
  absentPct: number;
  halfDayPct: number;
}

export interface DashboardStats {
  selectedDate?: string;
  totalWorkforce?: number;
  presentCount?: number;
  absentCount?: number;
  lateArrivalsCount?: number;
  halfDayCount?: number;
  attendanceRate?: number;
  absenteeismRate?: number;
  totalRecords: number;
  todayPunches: number;
  todayActiveEmployees: number;
  lastSyncAt: string | null;
  locationBreakdown: LocationBreakdown[];
  hourlyDistribution?: HourlyPunchDistribution[];
  statusBreakdown?: AttendanceStatusBreakdown;
  recentPunches: AttendanceRecord[];
}

export interface SyncLog {
  _id: string;
  sourceId: string;
  sourceName: string;
  startedAt: string;
  completedAt?: string;
  status: 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
  recordsFetched: number;
  recordsInserted: number;
  recordsSkipped: number;
  errorMessage?: string;
  requestFromDate?: string;
  requestToDate?: string;
  triggeredBy: 'MANUAL' | 'SCHEDULED';
  syncType?: 'RAW' | 'INOUT';
  createdAt: string;
}

export interface SyncLogsResponse {
  success: boolean;
  data: SyncLog[];
  pagination: Pagination;
}

export interface SyncResult {
  success: boolean;
  source?: string;
  sourceId?: string;
  fetched: number;
  inserted: number;
  duplicates: number;
  durationMs?: number;
  error?: string;
}

export interface SyncAllResponse {
  success: boolean;
  results: SyncResult[];
  totals: {
    fetched: number;
    inserted: number;
    duplicates: number;
  };
}

export interface CompanyHoliday {
  id: string;
  date: string;
  name: string;
  type: 'NATIONAL' | 'FESTIVAL' | 'OPTIONAL';
}

export interface ShiftConfig {
  shiftName: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  halfDayThresholdMinutes: number;
  fullDayThresholdMinutes: number;
  minCheckoutForFullDay?: string;
  breakDurationMinutes: number;
}

export interface OvertimeConfig {
  enabled: boolean;
}

export interface LeaveQuotaConfig {
  casualLeave: number;
  sickLeave: number;
  earnedLeave: number;
  compOff?: number;
}

export interface SyncSchedulerConfig {
  enabled: boolean;
  intervalMinutes: number;
}

export interface HRMSPolicySettings {
  shift: ShiftConfig;
  overtime: OvertimeConfig;
  leaves?: LeaveQuotaConfig;
  weeklyOffDays: string[];
  holidays: CompanyHoliday[];
  scheduler: SyncSchedulerConfig;
  updatedAt: string;
}

export interface SchedulerStatus {
  isRunning: boolean;
  enabled: boolean;
  intervalMinutes: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  totalRuns: number;
  lastRunResult: any;
  errorCount: number;
}

export interface EmployeeProfile {
  empCode: string;
  name: string;
  email?: string;
  phone?: string;
  dob?: string;
  doj?: string;
  department?: string;
  designation?: string;
  location?: string;
  operationsCategory?: string; // e.g. "Office Staff (3)"
  gender?: 'Male' | 'Female' | 'Other';
  bloodGroup?: string;
  emergencyContact?: string;
  
  // Annexure K — ColorMyles CTC & Salary Structure
  monthlyCtc?: number; // Total Gross CTC (L) PM
  annualCtc?: number; // Total Gross CTC (L) PA
  basicSalary?: number; // Basic (A) PM
  fixedSalary?: number; // Fixed Salary (B) PM
  hra?: number; // HRA (C1) PM
  specialAllowance?: number; // Special Allowance (C2) PM
  grossSalary?: number; // Gross Salary (D) PM
  employeePf?: number; // Employee PF (E) PM
  employeeEsic?: number; // Employee ESIC (F) PM
  totalNetSalary?: number; // Total Net Salary (G) PM
  employerPf?: number; // Employer PF (H) PM
  employerEsic?: number; // Employer ESIC (I) PM
  professionalTax?: number; // PT (J) PM
  minimumBonus?: number; // Minimum Bonus (K) PM

  otEligible: boolean;
  otRatePerHour?: number;
  bankAccount?: string;
  ifscCode?: string;
  bankName?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  status: 'active' | 'inactive' | 'resigned';
  notes?: string;
  updatedAt?: string;
}

export interface EmployeePayrollSummary {
  empCode: string;
  name: string;
  email?: string;
  phone?: string;
  dob?: string;
  doj?: string;
  department?: string;
  designation?: string;
  location?: string;
  month: string;
  monthDays: number; // Total calendar days in the target month (e.g. 30 for September)
  elapsedDays: number; // Days elapsed so far this month
  presentDays: number;
  halfDays: number;
  absentDays: number;
  lopDays: number;
  payableDays: number;
  weeklyOffs: number;
  holidays: number;
  totalWorkHours: number;
  totalOtHours: number;
  lateArrivals: number;
  monthlyCtc: number;
  basicSalary: number;
  hra: number;
  allowances: number;
  grossSalary?: number;
  employerPf?: number;
  employerEsic?: number;
  otRatePerHour: number;
  otEarnings: number;
  grossEarnings: number;
  lopDeduction: number;
  pfDeduction: number;
  esiDeduction: number;
  ptDeduction: number;
  totalDeductions: number;
  totalNetSalary?: number;
  netPayable: number;
  netPayableWords: string;
  bankAccount?: string;
  ifscCode?: string;
  bankName?: string;
  panNumber?: string;
}

export interface SendPayslipResponse {
  success: boolean;
  message: string;
  sentTo: string;
  previewHtml?: string;
}

export interface PayrollRunHistoryEntry {
  action: 'CLOSED' | 'REOPENED';
  byUser: string;
  at: string;
}

export interface PayrollRunStatus {
  month: string; // YYYY-MM
  status: 'OPEN' | 'CLOSED' | 'REOPENED';
  employeeCount?: number;
  totalNetPaid?: number;
  closedAt?: string;
  closedBy?: string;
  reopenedAt?: string;
  reopenedBy?: string;
  history?: PayrollRunHistoryEntry[];
}

export interface AttendanceRegularizationRequest {
  id: string;
  empCode: string;
  empName: string;
  requestType: 'MISSED_PUNCH' | 'LEAVE' | 'WORK_FROM_HOME' | 'ON_DUTY';
  date: string;
  inTime?: string;
  outTime?: string;
  leaveType?: 'CASUAL_LEAVE' | 'SICK_LEAVE' | 'EARNED_LEAVE';
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewComment?: string;
}

export interface LeaveBalance {
  casualLeave: number;
  sickLeave: number;
  earnedLeave: number;
  compOff: number;
}

