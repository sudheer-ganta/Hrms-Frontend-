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
  /** Weekly off worked right after consecutive absent days: counted as a normal day, no weekly-off pay. */
  offDayWorkAsNormalDay: boolean;
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
  /** Only on the all-locations answer: the full dashboard of each location, keyed by siteId. */
  bySite?: Record<string, Omit<DashboardStats, 'bySite'>>;
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
  /** Overtime hours: only time punched inside these windows is overtime. None = the shift earns no overtime. */
  otWindows: TimeWindow[];
}

export interface TimeWindow {
  start: string;
  end: string;
}

/** Provident Fund rules HR can change when the law does. Rates are percentages of the PF wages (12 = 12%). */
export interface PfPolicy {
  employeeRatePct: number;
  /** Part of the employer's share that goes to the pension scheme; the rest goes to the employer's EPF account. */
  epsRatePct: number;
  adminRatePct: number;
  edliRatePct: number;
  /** PF wage ceiling history, oldest first. The first row is always in force "from the beginning" (1900-01-01). */
  ceilings: { from: string; ceiling: number }[];
}

export interface HRMSPolicySettings {
  version: number;
  shift: ShiftConfig;
  /** Extra named shifts; an employee whose profile shiftName matches one uses it instead of the default shift. */
  shifts: ShiftConfig[];
  overtime: { enabled: boolean; hoursPerDay: number };
  /** Work on a weekly off and on a paid holiday are separate rules. */
  offDayWork: { weeklyOff: { recognition: 'MANUAL' | 'AUTOMATIC' }; paidHoliday: { recognition: 'MANUAL' | 'AUTOMATIC' } };
  leaves: { casualLeave: number; sickLeave: number; earnedLeave: number; compOff: number };
  weeklyOffDays: DayName[];
  holidays: CompanyHoliday[];
  scheduler: { enabled: boolean; intervalMinutes: number };
  ess: { geofenceMode: 'ENFORCE' | 'OFF' };
  statutory: { pf: PfPolicy };
  updatedAt: string;
  /** Computed by the server so no client re-implements shift math. */
  derived?: { overnightShift: boolean; lateAfter: string };
}

/** Writable subset of the policy (holidays have their own endpoints). */
// ------------------------------------------------------------------ rules (read-only rulebook generated by the server)
export interface RuleItem {
  title: string;
  detail: string;
}
export interface RuleSection {
  id: string;
  title: string;
  /** Where the numbers can be changed, or null when they are fixed in the payroll rules. */
  editableIn: string | null;
  rules: RuleItem[];
}
export interface RulesDocument {
  generatedAt: string;
  policyVersion: number;
  payrollRulesVersion: string;
  sections: RuleSection[];
}

export type PolicyUpdate = Partial<Pick<HRMSPolicySettings, 'shift' | 'shifts' | 'overtime' | 'offDayWork' | 'leaves' | 'weeklyOffDays' | 'scheduler' | 'ess' | 'statutory'>>;

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
  /** Last day of employment (YYYY-MM-DD). Payroll treats later days as outside employment, not as absence. */
  lastWorkingDay?: string;
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

  bankName?: string;
  bankAccount?: string;
  ifscCode?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  uanNumber?: string;
  esiNumber?: string;

  /** Salary history; the salary fields above mirror the latest revision. Absent = never revised. */
  salaryRevisions?: SalaryRevision[];

  status: EmployeeStatus;
  notes?: string;
  updatedAt?: string;
}

/** A salary change that takes effect from a month ('0000-00' = applies to every month). */
export interface SalaryRevision {
  effectiveFrom: string;
  values: Record<string, number>;
  changedBy?: string;
  changedAt: string;
}

/** What a client may send when saving a profile (salary fields are INPUTS; the backend derives the rest). */
export type EmployeeProfileInput = { salaryEffectiveFrom?: string } & Partial<Pick<EmployeeProfile,
  | 'name' | 'email' | 'phone' | 'dob' | 'gender' | 'bloodGroup' | 'emergencyContact'
  | 'doj' | 'lastWorkingDay' | 'department' | 'designation' | 'location' | 'operationsCategory' | 'managerEmpCode' | 'managerName'
  | 'shiftName' | 'status' | 'otEligible' | 'otMultiplier' | 'notes'
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
  /** Elapsed days before the joining date / after the last working day (not absence, not paid). */
  notEmployedDays?: number;
  weeklyOffs: number;
  holidays: number;
  totalWorkHours: number;
  totalOtHours: number;
  /** Overtime counted this month in whole minutes. Absent on older rows. */
  otMinutes?: number;
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
  /** Employer PF admin charge and EDLI, and the wages PF / ESI were worked out on. Absent on rows frozen before ruleset 2026.10-4. */
  employerPfAdmin?: number;
  employerEdli?: number;
  /** Employer's 12% split into the pension scheme (8.33%) and the employer's EPF account. Absent on older rows. */
  employerEps?: number;
  employerEpf?: number;
  /** Stretches of the month with a different PF wage ceiling (a single stretch in an ordinary month). Absent on older rows. */
  pfSegments?: { fromDay: number; toDay: number; days: number; ceiling: number; wages: number }[];
  pfWages?: number;
  esiWages?: number;
  /** Monthly pay items HR types in the OT Calculator. Absent on older rows. */
  attendanceBonus?: number;
  incrementAmount?: number;
  salaryAdvance?: number;
  otherDeduction?: number;
  lwfDeduction?: number;

  lopDeduction: number;
  pfDeduction: number;
  esiDeduction: number;
  ptDeduction: number;
  ptDeductedFromNet: boolean;
  totalDeductions: number;

  totalNetSalary: number;
  /** The month's designed salary structure (full-month contributions inside CTC), not the prorated deductions above. Absent on older rows. */
  salaryStructure?: {
    employeePf: number;
    employerPf: number;
    employeeEsic: number;
    employerEsic: number;
    professionalTax: number;
    minimumBonus: number;
  };
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
  multiplier?: number;
  /** Explicit HR overrides of what attendance recognized; omit to use the resolver's result. */
  weeklyOffWorkDays?: number;
  holidayWorkDays?: number;
  /** @deprecated legacy name for weeklyOffWorkDays. */
  sundayDays?: number;
  /** Monthly pay items in INR: advance / other deduction / LWF are recovered, attendance bonus / increment are added. */
  salaryAdvance?: number;
  otherDeduction?: number;
  lwf?: number;
  attendanceBonus?: number;
  increment?: number;
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
