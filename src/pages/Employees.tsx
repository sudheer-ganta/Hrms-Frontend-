import React, { useState, useEffect } from 'react';
import { LocationTabs } from '../components/layout/LocationTabs';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { api } from '../services/api';
import { AttendanceSource, EmployeeProfile, EmployeePayrollSummary, InOutRecord } from '../types';
import { Users, Search, Building2, Edit3, DollarSign, Download, Eye, Mail, Calendar, UserCheck } from 'lucide-react';
import { EmployeeDrawer } from '../components/employees/EmployeeDrawer';
import { EditEmployeeModal } from '../components/employees/EditEmployeeModal';
import { PayslipModal } from '../components/payroll/PayslipModal';
import { downloadCsvFile } from '../lib/payrollExport';

interface EmployeesPageProps {
  sources: AttendanceSource[];
  activeSourceId: string;
  onSelectSource: (id: string) => void;
  onOpenSync: (sourceId?: string) => void;
}

export const Employees: React.FC<EmployeesPageProps> = ({
  sources,
  activeSourceId,
  onSelectSource,
  onOpenSync,
}) => {
  const [profiles, setProfiles] = useState<EmployeeProfile[]>([]);
  const [payrollSummaries, setPayrollSummaries] = useState<Record<string, EmployeePayrollSummary>>({});
  const [inOutRecords, setInOutRecords] = useState<InOutRecord[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal / Drawer states
  const [selectedDrawerEmp, setSelectedDrawerEmp] = useState<{
    employeeCode: string;
    employeeName: string;
    sourceName: string;
    sourceId?: string;
  } | null>(null);

  const [editEmpCode, setEditEmpCode] = useState<string | null>(null);
  const [payslipEmpCode, setPayslipEmpCode] = useState<string | null>(null);

  // Employee records store the internal source id (e.g. "office"), but every other
  // screen shows the human-readable location name (e.g. "ColorMyles") — map it here
  // so this page doesn't leak internal ids into a manager-facing table.
  const getLocationName = (locId?: string): string => {
    if (!locId) return 'Budigere';
    const match = sources.find((s) => s.id.toLowerCase() === locId.toLowerCase());
    return match?.name || locId;
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allEmps, allPayroll, inOutRes] = await Promise.all([
        api.getAllEmployees().catch(() => [] as EmployeeProfile[]),
        api.getAllPayroll().catch(() => [] as EmployeePayrollSummary[]),
        api.getInOutAttendance({ limit: 500 }).catch(() => ({ data: [] as InOutRecord[] })),
      ]);

      setProfiles(allEmps);

      const payrollMap: Record<string, EmployeePayrollSummary> = {};
      for (const ps of allPayroll) {
        payrollMap[ps.empCode] = ps;
      }
      setPayrollSummaries(payrollMap);
      setInOutRecords(inOutRes.data || []);
    } catch (err) {
      console.error('Error loading employee directory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSourceId]);

  // Filter by location & search
  const filtered = profiles.filter((emp) => {
    // Location filter
    if (activeSourceId !== 'all') {
      const empLoc = (emp.location || '').toLowerCase();
      const targetLoc = activeSourceId.toLowerCase();
      if (!empLoc.includes(targetLoc)) return false;
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = emp.name.toLowerCase().includes(q);
      const matchCode = emp.empCode.toLowerCase().includes(q);
      const matchDept = (emp.department || '').toLowerCase().includes(q);
      const matchEmail = (emp.email || '').toLowerCase().includes(q);
      return matchName || matchCode || matchDept || matchEmail;
    }

    return true;
  });

  const handleExportDirectoryCSV = () => {
    const rows: string[] = [];
    rows.push(['ColorMyles HRMS — Complete Employee Master & Salary Directory'].map(s => `"${s}"`).join(','));
    rows.push([`Generated At: ${new Date().toLocaleString()}`, `Total Employees: ${filtered.length}`].map(s => `"${s}"`).join(','));
    rows.push('');

    const headers = [
      'Emp Code',
      'Employee Name',
      'Date of Birth (DOB)',
      'Official Email',
      'Phone Number',
      'Department',
      'Designation',
      'Primary Location',
      'Monthly Gross CTC (₹)',
      'Basic Salary (₹)',
      'HRA (₹)',
      'Special Allowances (₹)',
      'Overtime Eligible',
      'Payable Days (This Month)',
      'LOP Days',
      'Overtime Hours',
      'Estimated Net Pay (₹)',
      'Bank Account Number',
      'Bank IFSC Code',
    ];

    rows.push(headers.map(s => `"${s}"`).join(','));

    filtered.forEach((emp) => {
      const ps = payrollSummaries[emp.empCode];
      const row = [
        emp.empCode,
        emp.name,
        emp.dob || '—',
        emp.email || '—',
        emp.phone || '—',
        emp.department || 'Operations',
        emp.designation || 'Staff',
        getLocationName(emp.location),
        emp.monthlyCtc || '',
        emp.basicSalary || '',
        emp.hra || '',
        emp.specialAllowance || '',
        emp.otEligible ? 'Yes' : 'No',
        ps?.payableDays ?? '—',
        ps?.lopDays ?? '—',
        ps?.totalOtHours ? `+${ps.totalOtHours}h` : '0h',
        emp.monthlyCtc ? (ps?.netPayable ?? emp.totalNetSalary ?? emp.monthlyCtc) : '',
        emp.bankAccount || '—',
        emp.ifscCode || '—',
      ];
      rows.push(row.map(s => `"${String(s).replace(/"/g, '""')}"`).join(','));
    });

    const csv = rows.join('\r\n');
    downloadCsvFile(csv, `ColorMyles_Employee_Master_${Date.now()}.csv`);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#1184b0]" />
            <span>Employee Directory & Compensation</span>
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Manage employee personal profiles, DOB, official emails, CTC salary structures, and 1-click payslips
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportDirectoryCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs flex items-center gap-1.5 transition"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Directory CSV</span>
          </button>

          <button
            onClick={() => onOpenSync(activeSourceId !== 'all' ? activeSourceId : undefined)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#1184b0] hover:bg-[#0d6c92] rounded-xl shadow-xs flex items-center gap-1.5 transition"
          >
            <UserCheck className="w-4 h-4" />
            <span>Sync Biometrics</span>
          </button>
        </div>
      </div>

      {/* Location Filter Tabs */}
      <LocationTabs
        sources={sources}
        activeSourceId={activeSourceId}
        onSelectSource={onSelectSource}
        showAllOption={true}
      />

      {/* Search & Statistics Bar */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-4 shadow-card">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee by ID, name, department, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#1184b0] focus:bg-white rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
          <span className="hidden sm:inline">Showing</span>
          <span className="bg-sky-50 text-[#1184b0] font-bold px-2.5 py-1 rounded-lg border border-sky-100">
            {filtered.length} Employees
          </span>
        </div>
      </div>

      {/* Main Employee Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-card overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={8} cols={8} />
        ) : filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No Employees Found"
              description="No employee records match the selected location or search query."
              actionLabel="Sync Biometrics Now"
              onAction={() => onOpenSync(activeSourceId !== 'all' ? activeSourceId : undefined)}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap">Emp ID</th>
                  <th className="py-3.5 px-4">Employee Details</th>
                  <th className="py-3.5 px-4">Department / Role</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">DOB</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Location</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Monthly CTC</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Attendance (MTD)</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Est. Net Pay</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filtered.map((emp) => {
                  const ps = payrollSummaries[emp.empCode];
                  const hasCtc = Boolean(emp.monthlyCtc && emp.monthlyCtc > 0);
                  const ctc = emp.monthlyCtc || 0;
                  const netPay = ps?.netPayable ?? 0;

                  return (
                    <tr
                      key={emp.empCode}
                      className="hover:bg-sky-50/40 transition-all cursor-pointer group"
                      onClick={() =>
                        setSelectedDrawerEmp({
                          employeeCode: emp.empCode,
                          employeeName: emp.name,
                          sourceName: getLocationName(emp.location),
                          sourceId: emp.location?.toLowerCase() || 'budigere',
                        })
                      }
                    >
                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#1184b0] whitespace-nowrap">
                        {emp.empCode}
                      </td>

                      {/* Name & Email */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1184b0] to-[#011638] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                            {emp.name?.charAt(0) || 'E'}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block group-hover:text-[#1184b0] transition truncate">
                              {emp.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1 mt-0.5 truncate">
                              {emp.email ? (
                                <>
                                  <Mail className="w-3 h-3 text-sky-500 shrink-0" />
                                  <span className="truncate max-w-[160px]">{emp.email}</span>
                                </>
                              ) : (
                                <span className="text-slate-400 italic">No email</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Department / Designation */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">{emp.department || 'Operations'}</span>
                        <span className="text-[10px] text-slate-400 block">{emp.designation || 'Staff'}</span>
                      </td>

                      {/* DOB */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {emp.dob ? (
                          <span className="inline-flex items-center gap-1.5 font-mono text-slate-700 text-xs font-medium">
                            <Calendar className="w-3.5 h-3.5 text-[#1184b0] shrink-0" />
                            {emp.dob}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          {getLocationName(emp.location)}
                        </span>
                      </td>

                      {/* Monthly CTC */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {hasCtc ? (
                          <span className="font-bold text-slate-900 text-xs">
                            ₹{ctc.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Attendance (MTD) & Holidays */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {ps ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs">
                                {ps.payableDays}d
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                / {ps.monthDays || 25}d
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              {ps.holidays > 0 && (
                                <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200/80 px-1.5 py-0.5 rounded shadow-2xs" title="Paid Corporate Holiday (0 LOP)">
                                  +{ps.holidays} Holiday
                                </span>
                              )}
                              {ps.lopDays > 0 && (
                                <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200/80 px-1.5 py-0.5 rounded shadow-2xs">
                                  -{ps.lopDays}d LOP
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Est Net Salary */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {hasCtc && netPay > 0 ? (
                          <div>
                            <span className="font-bold text-emerald-600 text-xs block">
                              ₹{netPay.toLocaleString('en-IN')}
                            </span>
                            {ps && ps.totalOtHours > 0 && (
                              <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">
                                +{ps.totalOtHours}h OT
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedDrawerEmp({
                                employeeCode: emp.empCode,
                                employeeName: emp.name,
                                sourceName: getLocationName(emp.location),
                                sourceId: emp.location?.toLowerCase() || 'budigere',
                              })
                            }
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#1184b0] hover:bg-sky-50 border border-slate-200 transition"
                            title="View 360 Attendance & Timeline"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setPayslipEmpCode(emp.empCode)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200 transition"
                            title="Generate & Email Payslip"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditEmpCode(emp.empCode)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition"
                            title="Edit Profile & Salary"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee 360 Drawer */}
      {selectedDrawerEmp && (
        <EmployeeDrawer
          isOpen={Boolean(selectedDrawerEmp)}
          onClose={() => setSelectedDrawerEmp(null)}
          employee={selectedDrawerEmp}
          records={inOutRecords}
        />
      )}

      {/* Edit Profile & Salary Modal */}
      {editEmpCode && (
        <EditEmployeeModal
          isOpen={Boolean(editEmpCode)}
          onClose={() => setEditEmpCode(null)}
          empCode={editEmpCode}
          onSaved={() => {
            loadData();
          }}
        />
      )}

      {/* Payslip & Email Modal */}
      {payslipEmpCode && (
        <PayslipModal
          isOpen={Boolean(payslipEmpCode)}
          onClose={() => setPayslipEmpCode(null)}
          empCode={payslipEmpCode}
        />
      )}
    </div>
  );
};
