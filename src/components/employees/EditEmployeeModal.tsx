import React, { useState, useEffect } from 'react';
import { X, Save, User, Mail, Phone, Calendar, Briefcase, CreditCard, Clock, FileSpreadsheet, Building2 } from 'lucide-react';
import { EmployeeProfile } from '../../types';
import { api } from '../../services/api';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  empCode: string;
  onSaved: (updated: EmployeeProfile) => void;
}

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  isOpen,
  onClose,
  empCode,
  onSaved,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<EmployeeProfile>>({
    name: '',
    email: '',
    phone: '',
    dob: '',
    doj: '',
    department: '',
    designation: '',
    operationsCategory: '',
    monthlyCtc: undefined,
    basicSalary: undefined,
    fixedSalary: undefined,
    hra: undefined,
    specialAllowance: undefined,
    grossSalary: undefined,
    employeePf: undefined,
    employeeEsic: undefined,
    totalNetSalary: undefined,
    employerPf: undefined,
    employerEsic: undefined,
    professionalTax: undefined,
    minimumBonus: undefined,
    otEligible: true,
    otRatePerHour: 0,
    bankAccount: '',
    ifscCode: '',
    bankName: '',
    panNumber: '',
  });

  useEffect(() => {
    if (!isOpen || !empCode) return;

    let isMounted = true;
    setLoading(true);

    api.getEmployeeProfile(empCode)
      .then((profile) => {
        if (isMounted && profile) {
          setFormData({
            ...profile,
          });
        }
      })
      .catch((err) => console.warn('Could not fetch profile:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, empCode]);

  if (!isOpen) return null;

  // Real-time calculation helpers
  const basic = formData.basicSalary ?? 0;
  const fixed = formData.fixedSalary ?? basic;
  const hra = formData.hra ?? 0;
  const specialAllowance = formData.specialAllowance ?? 0;
  const gross = formData.grossSalary ?? (basic + hra + specialAllowance);

  const empPf = formData.employeePf ?? 0;
  const empEsic = formData.employeeEsic ?? 0;
  const netSalary = formData.totalNetSalary ?? Math.max(0, gross - empPf - empEsic);

  const emplrPf = formData.employerPf ?? 0;
  const emplrEsic = formData.employerEsic ?? 0;
  const pt = formData.professionalTax ?? 0;
  const bonus = formData.minimumBonus ?? 0;
  const calculatedCtc = formData.monthlyCtc ?? (gross + emplrPf + emplrEsic + pt + bonus);

  const handleFieldChange = (field: keyof EmployeeProfile, value: any) => {
    const numVal = value === '' || value === undefined ? undefined : Number(value);
    setFormData((prev) => {
      const updated = { ...prev, [field]: numVal };

      // Auto update gross and net if basic/hra/special are edited
      const b = field === 'basicSalary' ? (numVal ?? 0) : (prev.basicSalary ?? 0);
      const h = field === 'hra' ? (numVal ?? 0) : (prev.hra ?? 0);
      const s = field === 'specialAllowance' ? (numVal ?? 0) : (prev.specialAllowance ?? 0);
      const g = b + h + s;

      const epf = field === 'employeePf' ? (numVal ?? 0) : (prev.employeePf ?? 0);
      const eesic = field === 'employeeEsic' ? (numVal ?? 0) : (prev.employeeEsic ?? 0);
      const net = Math.max(0, g - epf - eesic);

      const emPf = field === 'employerPf' ? (numVal ?? 0) : (prev.employerPf ?? 0);
      const emEsic = field === 'employerEsic' ? (numVal ?? 0) : (prev.employerEsic ?? 0);
      const ptax = field === 'professionalTax' ? (numVal ?? 0) : (prev.professionalTax ?? 0);
      const bon = field === 'minimumBonus' ? (numVal ?? 0) : (prev.minimumBonus ?? 0);
      const ctc = g + emPf + emEsic + ptax + bon;

      return {
        ...updated,
        grossSalary: g > 0 ? g : undefined,
        totalNetSalary: net > 0 ? net : undefined,
        monthlyCtc: ctc > 0 ? ctc : undefined,
        annualCtc: ctc > 0 ? ctc * 12 : undefined,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateEmployeeProfile(empCode, formData);
      onSaved(updated);
      onClose();
    } catch (err: any) {
      alert(`Failed to save profile: ${err?.response?.data?.error || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Clean Header */}
        <div className="px-6 py-4 bg-[#011638] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold border border-white/20">
              {empCode.slice(-3)}
            </div>
            <div>
              <h3 className="font-heading font-bold text-base leading-tight">
                Employee Profile & Salary Breakup (Annexure K)
              </h3>
              <p className="text-xs text-slate-300">
                Emp ID: <span className="font-mono font-bold text-white">{empCode}</span> • {formData.name || 'Staff Member'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading employee details...</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
            {/* 1. Personal & Contact Information */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#1184b0]" /> Personal & Official Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1184b0] focus:outline-none bg-white"
                    placeholder="e.g. Ganta Mohan Sai Sudheer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">DOB (Date of Birth)</label>
                  <input
                    type="date"
                    value={formData.dob || ''}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1184b0] focus:outline-none bg-white text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">DOJ (Date of Joining)</label>
                  <input
                    type="date"
                    value={formData.doj || ''}
                    onChange={(e) => setFormData({ ...formData, doj: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1184b0] focus:outline-none bg-white text-slate-700"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Official Email (For Payslips)</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1184b0] focus:outline-none bg-white"
                    placeholder="e.g. employee@colormyles.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1184b0] focus:outline-none bg-white"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Operations Category</label>
                  <input
                    type="text"
                    value={formData.operationsCategory || ''}
                    onChange={(e) => setFormData({ ...formData, operationsCategory: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1184b0] focus:outline-none bg-white"
                    placeholder="Office Staff (3)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1184b0] focus:outline-none bg-white"
                    placeholder="Digital Marketing / Operations"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={formData.designation || ''}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1184b0] focus:outline-none bg-white"
                    placeholder="Full Stack Developer"
                  />
                </div>
              </div>
            </div>

            {/* 2. ANNEXURE K: Clean Light Salary Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-heading font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-[#1184b0]" /> Annexure K — Breakup of CTC
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Enter Monthly (PM) values. Annual (PA) amounts auto-compute.
                  </p>
                </div>
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
                      <th className="py-2.5 px-4">PARTICULARS</th>
                      <th className="py-2.5 px-4 text-right w-44">Salary PA (Rs.)</th>
                      <th className="py-2.5 px-4 text-right w-44">Salary PM (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                    {/* Basic (A) */}
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2 px-4">Basic (A)</td>
                      <td className="py-2 px-4 text-right font-mono text-slate-500">
                        {basic > 0 ? (basic * 12).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <input
                          type="number"
                          value={formData.basicSalary ?? ''}
                          onChange={(e) => handleFieldChange('basicSalary', e.target.value)}
                          placeholder="0"
                          className="w-32 text-right bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1184b0]"
                        />
                      </td>
                    </tr>

                    {/* Fixed Salary (B) */}
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2 px-4">Fixed Salary (B)</td>
                      <td className="py-2 px-4 text-right font-mono text-slate-500">
                        {fixed > 0 ? (fixed * 12).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <input
                          type="number"
                          value={formData.fixedSalary ?? ''}
                          onChange={(e) => handleFieldChange('fixedSalary', e.target.value)}
                          placeholder="0"
                          className="w-32 text-right bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1184b0]"
                        />
                      </td>
                    </tr>

                    {/* HRA (C1) */}
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2 px-4">HRA (C1)</td>
                      <td className="py-2 px-4 text-right font-mono text-slate-500">
                        {hra > 0 ? (hra * 12).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <input
                          type="number"
                          value={formData.hra ?? ''}
                          onChange={(e) => handleFieldChange('hra', e.target.value)}
                          placeholder="0"
                          className="w-32 text-right bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1184b0]"
                        />
                      </td>
                    </tr>

                    {/* Special Allowance (C2) */}
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2 px-4">Special Allowance (C2)</td>
                      <td className="py-2 px-4 text-right font-mono text-slate-500">
                        {specialAllowance > 0 ? (specialAllowance * 12).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <input
                          type="number"
                          value={formData.specialAllowance ?? ''}
                          onChange={(e) => handleFieldChange('specialAllowance', e.target.value)}
                          placeholder="0"
                          className="w-32 text-right bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1184b0]"
                        />
                      </td>
                    </tr>

                    {/* Gross Salary (D) */}
                    <tr className="bg-slate-100 font-bold text-slate-900 border-y border-slate-200">
                      <td className="py-2.5 px-4">Gross Salary (D)</td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        {gross > 0 ? `₹${(gross * 12).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-bold text-slate-900 pr-4">
                        {gross > 0 ? `₹${gross.toLocaleString('en-IN')}` : '—'}
                      </td>
                    </tr>

                    {/* Employee's Contribution to PF (E) */}
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2 px-4 text-slate-700">Employee's Contribution to PF (E)</td>
                      <td className="py-2 px-4 text-right font-mono text-slate-500">
                        {empPf > 0 ? (empPf * 12).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <input
                          type="number"
                          value={formData.employeePf ?? ''}
                          onChange={(e) => handleFieldChange('employeePf', e.target.value)}
                          placeholder="0"
                          className="w-32 text-right bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1184b0]"
                        />
                      </td>
                    </tr>

                    {/* Employee's Contribution to ESIC (F) */}
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2 px-4 text-slate-700">Employee's Contribution to ESIC (F)</td>
                      <td className="py-2 px-4 text-right font-mono text-slate-500">
                        {empEsic > 0 ? (empEsic * 12).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <input
                          type="number"
                          value={formData.employeeEsic ?? ''}
                          onChange={(e) => handleFieldChange('employeeEsic', e.target.value)}
                          placeholder="0"
                          className="w-32 text-right bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1184b0]"
                        />
                      </td>
                    </tr>

                    {/* Total Net Salary (G) */}
                    <tr className="bg-sky-50 font-bold text-slate-900 border-y-2 border-sky-200">
                      <td className="py-2.5 px-4 text-slate-900 font-extrabold">Total Net Salary (G)</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-900">
                        {netSalary > 0 ? `₹${(netSalary * 12).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-sm font-extrabold text-[#1184b0] pr-4">
                        {netSalary > 0 ? `₹${netSalary.toLocaleString('en-IN')}` : '—'}
                      </td>
                    </tr>

                    {/* Employer's Contribution to PF (H) */}
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2 px-4 text-slate-700">Employer's Contribution to PF (H)</td>
                      <td className="py-2 px-4 text-right font-mono text-slate-500">
                        {emplrPf > 0 ? (emplrPf * 12).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <input
                          type="number"
                          value={formData.employerPf ?? ''}
                          onChange={(e) => handleFieldChange('employerPf', e.target.value)}
                          placeholder="0"
                          className="w-32 text-right bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1184b0]"
                        />
                      </td>
                    </tr>

                    {/* Employer's Contribution to ESIC (I) */}
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2 px-4 text-slate-700">Employer's Contribution to ESIC (I)</td>
                      <td className="py-2 px-4 text-right font-mono text-slate-500">
                        {emplrEsic > 0 ? (emplrEsic * 12).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <input
                          type="number"
                          value={formData.employerEsic ?? ''}
                          onChange={(e) => handleFieldChange('employerEsic', e.target.value)}
                          placeholder="0"
                          className="w-32 text-right bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1184b0]"
                        />
                      </td>
                    </tr>

                    {/* PT (J) */}
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2 px-4 text-slate-700">PT (J)</td>
                      <td className="py-2 px-4 text-right font-mono text-slate-500">
                        {pt > 0 ? (pt * 12).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <input
                          type="number"
                          value={formData.professionalTax ?? ''}
                          onChange={(e) => handleFieldChange('professionalTax', e.target.value)}
                          placeholder="0"
                          className="w-32 text-right bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1184b0]"
                        />
                      </td>
                    </tr>

                    {/* Minimum Bonus (K) */}
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2 px-4 text-slate-700">Minimum Bonus (K)</td>
                      <td className="py-2 px-4 text-right font-mono text-slate-500">
                        {bonus > 0 ? (bonus * 12).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <input
                          type="number"
                          value={formData.minimumBonus ?? ''}
                          onChange={(e) => handleFieldChange('minimumBonus', e.target.value)}
                          placeholder="0"
                          className="w-32 text-right bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1184b0]"
                        />
                      </td>
                    </tr>

                    {/* Total Gross CTC (L) */}
                    <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-300">
                      <td className="py-3 px-4 text-white font-extrabold">Total Gross CTC (L)</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-200">
                        {calculatedCtc > 0 ? `₹${(calculatedCtc * 12).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sm font-extrabold text-white pr-4">
                        {calculatedCtc > 0 ? `₹${calculatedCtc.toLocaleString('en-IN')}` : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Overtime Policy & Bank Account */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Overtime Policy */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="otEligibleCheck"
                    checked={formData.otEligible ?? true}
                    onChange={(e) => setFormData({ ...formData, otEligible: e.target.checked })}
                    className="w-4 h-4 text-[#1184b0] rounded border-slate-300 focus:ring-[#1184b0]"
                  />
                  <label htmlFor="otEligibleCheck" className="text-xs font-semibold text-slate-800 cursor-pointer flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-sky-600" /> Overtime (OT) Eligible
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">
                  Calculates extra hours past the 8-hour shift automatically.
                </p>

                <div className="pt-1">
                  <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                    Custom OT Rate (₹ / hour)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    disabled={!(formData.otEligible ?? true)}
                    value={formData.otRatePerHour ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        otRatePerHour: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                    placeholder="Auto (company default rate)"
                    className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white font-mono disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Leave blank to use the company-wide OT multiplier from Settings. Set a value here only if this employee's OT rate is different.
                  </p>
                </div>
              </div>

              {/* Bank Details */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">Bank A/C</label>
                    <input
                      type="text"
                      value={formData.bankAccount || ''}
                      onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                      className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white font-mono"
                      placeholder="918273645019"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">IFSC Code</label>
                    <input
                      type="text"
                      value={formData.ifscCode || ''}
                      onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                      className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white font-mono uppercase"
                      placeholder="HDFC0001234"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#1184b0] hover:bg-[#0d6c92] rounded-lg shadow-sm flex items-center space-x-2 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Annexure K Profile'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
