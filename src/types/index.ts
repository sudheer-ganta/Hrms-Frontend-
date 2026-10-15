/**
 * Canonical frontend types. They mirror the backend DTOs one-to-one; the backend owns every
 * business rule and the frontend only renders these values.
 */

// ------------------------------------------------------------------ API contract
export type ApiErrorCode =
  | 'VALIDATION_ERROR' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT'
  | 'BUSINESS_RULE' | 'UPSTREAM_FAILED' | 'SERVICE_UNAVAILABLE' | 'RATE_LIMITED' | 'INTERNAL';

export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

export interface ApiErrorBody {
  success: false;
  error: { code: ApiErrorCode; message: string; details?: ApiErrorDetail[] };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ------------------------------------------------------------------ attendance
export const ATTENDANCE_STATUSES = [
  'PRESENT', 'HALF_DAY', 'ABSENT', 'WEEKLY_OFF', 'HOLIDAY', 'LEAVE_PAID', 'LEAVE_UNPAID',
  'WORK_FROM_HOME', 'ON_DUTY', 'MISSED_PUNCH',
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export type AttendanceOrigin = 'DEVICE' | 'ESS_WEB' | 'REGULARIZATION' | 'LEAVE' | 'WFH' | 'ON_DUTY';

/** One employee, one business date, one verdict (identical for portal, admin grid, timesheet and payroll). */
export interface AttendanceDay {
  employeeCode: string;
  employeeName: string;
  businessDate: string; // YYYY-MM-DD (IST)
  siteId: string | null;
  siteName: string | null;
  status: AttendanceStatus | null; // null only for future days
  statusLabel: string;
  firstIn: string | null; // HH:mm IST
  lastOut: string | null;
  workMinutes: number;
  overtimeMinutes: number;
  isLate: boolean;
  lateMinutes: number;
  earlyCheckoutMinutes: number;
  isWeeklyOff: boolean;
  isHoliday: boolean;
  isPaidHoliday: boolean;
  holidayName: string | null;
  /** Days of work recognized on a weekly off / paid holiday under policy.offDayWork (0 unless AUTOMATIC). */
  offDayWorkFraction: number;
  /** Policy version this verdict was computed under. */
  policyVersion: number;
  vendorStatus: string | null;
  origins: AttendanceOrigin[];
  sourceIds: string[];
  manualOverride: boolean;
  adjustmentId: string | null;
  requestId: string | null;
  inProgress: boolean;
}

export interface AttendanceSummary {
  totalRecords: number;
  presentCount: number;
  halfDayCount: number;
  absentCount: number;
  leaveCount: number;
  offCount: number;
  missedPunchCount: number;
  totalWorkMinutes: number;
  avgWorkMinutes: number;
  totalOvertimeMinutes: number;
  lateArrivalsCount: number;
}

export interface AttendanceDaysResponse {
  success: true;
  data: AttendanceDay[];
  pagination: Pagination;
  summary: AttendanceSummary;
}

export interface AttendanceCalendar {
  month: string;
  employeeCode: string;
  days: AttendanceDay[];
}

export interface TimesheetEmployee {
  employeeCode: string;
  employeeName: string;
  siteId: string | null;
  siteName: string | null;
  days: Record<string, AttendanceDay>;
  totals: {
    presentDays: number; halfDays: number; leaveDays: number; absentDays: number; offDays: number;
    missedPunchDays: number; workMinutes: number; overtimeMinutes: number; lateDays: number;
  };
}

/** Immutable raw punch (biometric or ESS). */
export interface RawPunch {
  _id: string;
  sourceId: string;
  sourceName: string;
  siteId?: string;
  employeeCode: string;
  employeeName: string;
  punchDateTime: string; // ISO instant (UTC)
  entryDate: string;     // IST business date
  entryTime: string;     // HH:mm:ss IST
  machineId: string;
  machineFlag?: string | null;
  origin: AttendanceOrigin;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  syncedAt: string;
  vendorRecordHash: string;
}

export interface RawPunchResponse {
  success: true;
  data: RawPunch[];
  pagination: Pagination;
}

export interface PunchStatus {
  empCode: string;
  businessDate: string;
  serverTimeIst: string;
  checkedIn: boolean;
  checkedOut: boolean;
  nextAction: 'IN' | 'OUT';
  firstIn: string | null;
  lastOut: string | null;
  workMinutes: number;
  status: AttendanceStatus | null;
  statusLabel: string;
  inProgress: boolean;
  geofence: { mode: 'ENFORCE' | 'OFF'; configured: boolean };
}

export interface PunchResult extends PunchStatus {
  action: 'CHECKED_IN' | 'CHECKED_OUT';
  siteId: string | null;
  geofenceResult: 'INSIDE' | 'OVERRIDDEN' | 'NOT_ENFORCED';
  message: string;
}

// ------------------------------------------------------------------ sites & sources
export interface Site {
  siteId: string;
  name: string;
  displayName: string;
  active: boolean;
  geo?: { lat: number; lng: number; radiusM: number };
}

export type SourceHealth = 'connected' | 'degraded' | 'failed' | 'running' | 'never_synced' | 'credentials_missing' | 'disabled';

export interface SyncRunInfo {
  status: SyncStatus;
  at: string | null;
  error: string | null;
}

export interface AttendanceSource {
  id: string;
  siteId: string;
  name: string;
  internalName?: string;
  geoConfigured?: boolean;
  status: SourceHealth;
  lastSync: string | null;
  lastRawSync: SyncRunInfo | null;
  lastInOutSync: SyncRunInfo | null;
}

// ------------------------------------------------------------------ dashboard
export interface LocationBreakdown {
  siteId: string;
  sourceId: string;
  sourceName: string;
  totalWorkforce: number;
  presentCount: number;
  halfDayCount: number;
  absentCount: number;
  leaveCount: number;
  offCount: number;
  attendanceRate: number | null;
  totalPunches: number;
  todayPunches: number;
  lastSyncStatus: string;
  lastSyncAt: string | null;
}

export interface HourlyPunchDistribution {
  hour: string;
  punches: number;
  label: string;
}

export interface DashboardStats {
  selectedDate: string;
  isFuture: boolean;
  totalWorkforce: number;
  presentCount: number;
  halfDayCount: number;
  absentCount: number;
  leaveCount: number;
  weeklyOffCount: number;
  lateArrivalsCount: number;
  attendanceRate: number | null;
  absenteeismRate: number | null;
  todayPunches: number;
  totalRecords: number;
  lastSyncAt: string | null;
  locationBreakdown: LocationBreakdown[];
  hourlyDistribution: HourlyPunchDistribution[];
  recentPunches: RawPunch[];
}

// ------------------------------------------------------------------ sync
export type SyncStatus = 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
export type SyncType = 'RAW' | 'INOUT';

export interface SyncLog {
  _id: string;
  sourceId: string;
  sourceName: string;
  startedAt: string;
  completedAt?: string;
  status: SyncStatus;
  recordsFetched: number;
  recordsInserted: number;
  recordsSkipped: number;
  errorMessage?: string;
  requestFromDate?: string;
  requestToDate?: string;
  triggeredBy: 'MANUAL' | 'SCHEDULED';
  syncType: SyncType;
  createdAt: string;
}

export interface SyncLogsResponse {
  success: true;
  data: SyncLog[];
  pagination: Pagination;
}

/** Result of syncing one source (same shape for raw and IN/OUT). */
export interface SyncResult {
  success: boolean;
  sourceId: string;
  source: string;
  syncType: SyncType;
  fetched: number;
  inserted: number;
  duplicates: number;
  status: SyncStatus;
  logId?: string;
  durationMs: number;
  note?: string;
  error?: string;
}

export interface SyncAllResult {
  results: SyncResult[];
  totals: { fetched: number; inserted: number; duplicates: number };
}

export interface SchedulerStatus {
  isRunning: boolean;
  enabled: boolean;
  intervalMinutes: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  totalRuns: number;
  lastRunResult: {
    timestamp?: string;
    success?: boolean;
    skipped?: string;
    errors?: string[];
    raw?: { fetched: number; inserted: number };
    inOut?: { fetched: number; upserted: number };
  } | null;
  errorCount: number;
  holdsLease: boolean;
  instanceEnabled: boolean;
}

// ------------------------------------------------------------------ policy
export type DayName = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export const DAY_NAMES: readonly DayName[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
export type HolidayType = 'NATIONAL' | 'FESTIVAL' | 'OPTIONAL';

export interface CompanyHoliday {
  id: string;
  date: string;
  name: string;
  type: HolidayType;
  /** true = paid company day-off; false = a normal working day (optional holiday). */
  paid: boolean;
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

export interface HRMSPolicySettings {
  version: number;
  shift: ShiftConfig;
  overtime: { enabled: boolean; hoursPerDay: number };
  /** Work on a weekly off and on a paid holiday are separate rules. */
  offDayWork: { weeklyOff: { recognition: 'MANUAL' | 'AUTOMATIC' }; paidHoliday: { recognition: 'MANUAL' | 'AUTOMATIC' } };
  leaves: { casualLeave: number; sickLeave: number; earnedLeave: number; compOff: number };
  weeklyOffDays: DayName[];
  holidays: CompanyHoliday[];
  scheduler: { enabled: boolean; intervalMinutes: number };
  ess: { geofenceMode: 'ENFORCE' | 'OFF' };
  updatedAt: string;
  /** Computed by the server so no client re-implements shift math. */
  derived?: { standardDayHours: number; overnightShift: boolean; lateAfter: string };
}

/** Writable subset of the policy (holidays have their own endpoints). */
export type PolicyUpdate = Partial<Pick<HRMSPolicySettings, 'shift' | 'overtime' | 'offDayWork' | 'leaves' | 'weeklyOffDays' | 'scheduler' | 'ess'>>;

// ------------------------------------------------------------------ employees
export type EmployeeStatus = 'active' | 'inactive' | 'resigned';

export interface EmployeeProfile {
  employeeId?: string;
  empCode: string;
  name: string;
  email?: string;
  phone?: string;
  dob?: string;
  doj?: string;
  department?: string;
  designation?: string;
  location?: string; // siteId
  operationsCategory?: string;
  gender?: 'Male' | 'Female' | 'Other';
  bloodGroup?: string;
  emergencyContact?: string;
  managerEmpCode?: string;
  managerName?: string;
  shiftName?: string;

  monthlyCtc?: number;
  annualCtc?: number;
  basicSalary?: number;
  da?: number;
  fixedSalary?: number;
  hra?: number;
  specialAllowance?: number;
  otherAllowance?: number;
  grossSalary?: number;
  employeePf?: number;
  employeeEsic?: number;
  totalNetSalary?: number;
  employerPf?: number;
  employerEsic?: number;
  professionalTax?: number;
  minimumBonus?: number;

  otEligible: boolean;
  otMultiplier?: number;
  otRatePerHour?: number;

  bankName?: string;
  bankAccount?: string;
  ifscCode?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  uanNumber?: string;
  esiNumber?: string;

  status: EmployeeStatus;
  notes?: string;
  updatedAt?: string;
}

/** What a client may send when saving a profile (salary fields are INPUTS; the backend derives the rest). */
export type EmployeeProfileInput = Partial<Pick<EmployeeProfile,
  | 'name' | 'email' | 'phone' | 'dob' | 'gender' | 'bloodGroup' | 'emergencyContact'
  | 'doj' | 'department' | 'designation' | 'location' | 'operationsCategory' | 'managerEmpCode' | 'managerName'
  | 'shiftName' | 'status' | 'otEligible' | 'otMultiplier' | 'otRatePerHour' | 'notes'
  | 'monthlyCtc' | 'basicSalary' | 'da' | 'hra' | 'specialAllowance' | 'otherAllowance'
  | 'employeePf' | 'employerPf' | 'employeeEsic' | 'employerEsic' | 'professionalTax' | 'minimumBonus'
  | 'bankName' | 'bankAccount' | 'ifscCode' | 'panNumber' | 'aadhaarNumber' | 'uanNumber' | 'esiNumber'>>;

export interface SalaryBreakdown {
  monthlyCtc: number;
  annualCtc: number;
  basicSalary: number;
  fixedSalary: number;
  da: number;
  hra: number;
  specialAllowance: number;
  otherAllowance: number;
  grossSalary: number;
  employeePf: number;
  employerPf: number;
  employeeEsic: number;
  employerEsic: number;
  professionalTax: number;
  minimumBonus: number;
  totalNetSalary: number;
  rulesVersion: string;
}

// ------------------------------------------------------------------ payroll
export interface PayslipLine {
  code: string;
  label: string;
  amount: number;
  note?: string;
}

/** sum(earnings) - sum(deductions) = netPay, always. */
export interface PayslipBreakdown {
  earnings: PayslipLine[];
  deductions: PayslipLine[];
  employerBorne: PayslipLine[];
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
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
  siteId?: string;

  payrollStatus: 'LIVE' | 'CLOSED';
  isProvisional: boolean;
  snapshotVersion?: number;
  rulesVersion: string;

  month: string;
  monthDays: number;
  elapsedDays: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  leaveDays: number;
  unpaidLeaveDays: number;
  missedPunchDays: number;
  wfhDays: number;
  onDutyDays: number;
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
  grossSalary: number;
  da: number;
  otherAllowance: number;
  otWageBase: number;
  otDailyWage: number;
  otHourlyWage: number;
  otHoursPerDay: number;
  otEligible: boolean;
  otMultiplier: number;
  otRatePerHour: number;
  otEarnings: number;
  /** Effective days priced (HR override if present, else what the attendance resolver recognized). */
  weeklyOffWorkDays: number;
  holidayWorkDays: number;
  /** What the resolver recognized under Settings, before any HR override. */
  weeklyOffWorkAutoDays: number;
  holidayWorkAutoDays: number;
  offDayWorkOverridden: boolean;
  weeklyOffWorkEarnings: number;
  holidayWorkEarnings: number;
  /** Only on rows frozen before the weekly-off / holiday split. */
  sundayDays?: number;
  sundayEarnings?: number;
  grossEarnings: number;

  employerPf: number;
  employerEsic: number;

  lopDeduction: number;
  pfDeduction: number;
  esiDeduction: number;
  ptDeduction: number;
  ptDeductedFromNet: boolean;
  totalDeductions: number;

  totalNetSalary: number;
  netPayable: number;
  netPayableWords: string;

  payslip: PayslipBreakdown;

  bankAccount?: string;
  ifscCode?: string;
  bankName?: string;
  panNumber?: string;
  uanNumber?: string;
  esiNumber?: string;
}

/** Working days of a month with no stored attendance for anyone (they would lock as loss of pay for everybody). */
export interface AttendanceCoverage {
  month: string;
  workingDays: number;
  daysWithData: number;
  missingDates: string[];
}

export interface OtAdjustment {
  otHours?: number;
  totalWorkHours?: number;
  multiplier?: number;
  /** Explicit HR overrides of what attendance recognized; omit to use the resolver's result. */
  weeklyOffWorkDays?: number;
  holidayWorkDays?: number;
  /** @deprecated legacy name for weeklyOffWorkDays. */
  sundayDays?: number;
}
export type OtAdjustments = Record<string, OtAdjustment>;

export interface SendPayslipResponse {
  message: string;
  sentTo: string;
  previewHtml?: string;
}

export interface PayrollRunHistoryEntry {
  action: 'CLOSED' | 'REOPENED';
  byUser: string;
  at: string;
  version?: number;
  reason?: string;
}

export interface PayrollRunStatus {
  month: string;
  status: 'OPEN' | 'CLOSED' | 'REOPENED';
  currentVersion?: number;
  employeeCount?: number;
  totalNetPaid?: number;
  closedAt?: string;
  closedBy?: string;
  reopenedAt?: string;
  reopenedBy?: string;
  reopenReason?: string;
  history?: PayrollRunHistoryEntry[];
}

// ------------------------------------------------------------------ requests
export type RequestType = 'MISSED_PUNCH' | 'LEAVE' | 'WORK_FROM_HOME' | 'ON_DUTY';
export type LeaveType = 'CASUAL_LEAVE' | 'SICK_LEAVE' | 'EARNED_LEAVE' | 'COMP_OFF' | 'UNPAID_LEAVE';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'APPLIED' | 'REJECTED' | 'CANCELLED' | 'REVOKED';

export interface AttendanceRegularizationRequest {
  id: string;
  empCode: string;
  empName: string;
  requestType: RequestType;
  date: string;
  endDate?: string;
  halfDay?: boolean;
  days?: number;
  leaveYear?: number;
  inTime?: string;
  outTime?: string;
  leaveType?: LeaveType;
  reason: string;
  status: RequestStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewComment?: string;
  appliedAt?: string;
  applyError?: string;
  revokedAt?: string;
  revokedBy?: string;
  revokeReason?: string;
}

export interface CreateRequestInput {
  requestType: RequestType;
  date: string;
  endDate?: string;
  halfDay?: boolean;
  inTime?: string;
  outTime?: string;
  leaveType?: LeaveType;
  reason: string;
}

export interface LeaveBalanceEntry {
  quota: number;
  used: number;
  pending: number;
  available: number;
}

export interface LeaveBalance {
  empCode: string;
  year: number;
  balances: Record<Exclude<LeaveType, 'UNPAID_LEAVE'>, LeaveBalanceEntry>;
}

// ------------------------------------------------------------------ misc
export interface HealthStatus {
  status: 'ok' | 'degraded';
  database: { connected: boolean };
}
