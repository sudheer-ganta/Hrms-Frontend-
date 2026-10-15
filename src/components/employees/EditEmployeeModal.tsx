import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, User, Briefcase, CreditCard, Clock, FileSpreadsheet } from 'lucide-react';
import { EmployeeProfile, EmployeeProfileInput, SalaryBreakdown, Site } from '../../types';
import { api } from '../../services/api';
import { errorMessage } from '../../lib/apiError';
import { inr } from '../../lib/utils';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  empCode: string;
  onSaved: (updated: EmployeeProfile) => void;
}

type SalaryKey = 'basicSalary' | 'da' | 'hra' | 'otherAllowance' | 'specialAllowance' | 'employeePf' | 'employerPf' | 'employeeEsic' | 'employerEsic' | 'professionalTax' | 'minimumBonus';
const SALARY_LABELS: Record<SalaryKey, string> = {
  basicSalary: 'Basic (A)', da: 'Dearness Allowance', hra: 'HRA (C1)', otherAllowance: 'Other Allowance', specialAllowance: 'Special Allowance (C2)',
  employeePf: 'Employee PF (E)', employerPf: 'Employer PF (H)', employeeEsic: 'Employee ESIC (F)', employerEsic: 'Employer ESIC (I)',
  professionalTax: 'Professional Tax (J)', minimumBonus: 'Minimum Bonus (K)',
};
const SALARY_KEYS = Object.keys(SALARY_LABELS) as SalaryKey[];

const buildSalaryInputs = (ctc: string, overrides: Partial<Record<SalaryKey, string>>): EmployeeProfileInput => {
  const out: EmployeeProfileInput = {};
  const n = Number(ctc);
  if (ctc.trim() !== '' && Number.isFinite(n)) out.monthlyCtc = n;
  for (const k of SALARY_KEYS) {
    const v = overrides[k];
    if (v !== undefined && v.trim() !== '' && Number.isFinite(Number(v))) out[k] = Number(v);
  }
  return out;
};

const cls = 'w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1184b0] focus:outline-none bg-white';

/**
 * The salary breakdown is NOT computed here. The form sends salary INPUTS (CTC and any explicit
 * overrides) to the backend preview endpoint, which applies the single salary formula and returns every
 * component. This modal only displays that result.
 */
export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({ isOpen, onClose, empCode, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [form, setForm] = useState<Partial<EmployeeProfile>>({});
  const [ctc, setCtc] = useState<string>('');
  const [overrides, setOverrides] = useState<Partial<Record<SalaryKey, string>>>({});
  const [preview, setPreview] = useState<SalaryBreakdown | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [initialSalaryKey, setInitialSalaryKey] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !empCode) return;
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.all([api.getEmployeeProfile(empCode), api.getSites().catch(() => [] as Site[])])
      .then(async ([p, s]) => {
        if (!alive) return;
        setSites(s);
        setForm(p);
        setCtc(p.monthlyCtc ? String(p.monthlyCtc) : '');
        // Pre-fill an override only where the stored value differs from what the formula gives for this CTC.
        const next: Partial<Record<SalaryKey, string>> = {};
        if (p.monthlyCtc) {
          const base = await api.previewSalary({ monthlyCtc: p.monthlyCtc }).catch(() => null);
          if (base) for (const k of SALARY_KEYS) if (p[k] !== undefined && p[k] !== null && p[k] !== base[k]) next[k] = String(p[k]);
        }
        if (alive) {
          setOverrides(next);
          setInitialSalaryKey(JSON.stringify(buildSalaryInputs(p.monthlyCtc ? String(p.monthlyCtc) : '', next)));
        }
      })
      .catch((e) => alive && setError(errorMessage(e, 'Could not load the employee.')))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [isOpen, empCode]);

  const salaryInputs = useMemo(() => buildSalaryInputs(ctc, overrides), [ctc, overrides]);

  // Live preview straight from the backend formula (debounced).
  useEffect(() => {
    if (!isOpen) return;
    if (!salaryInputs.monthlyCtc || salaryInputs.monthlyCtc <= 0) { setPreview(null); setPreviewError(null); return; }
    let alive = true;
    const t = setTimeout(() => {
      api.previewSalary(salaryInputs)
        .then((b) => { if (alive) { setPreview(b); setPreviewError(null); } })
        .catch((e) => { if (alive) { setPreview(null); setPreviewError(errorMessage(e)); } });
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [salaryInputs, isOpen]);

  if (!isOpen) return null;

  const set = <K extends keyof EmployeeProfile>(key: K, value: EmployeeProfile[K]) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: EmployeeProfileInput = {
        name: form.name, email: form.email ?? '', phone: form.phone ?? '', dob: form.dob ?? '', doj: form.doj ?? '',
        gender: form.gender, bloodGroup: form.bloodGroup, emergencyContact: form.emergencyContact,
        department: form.department, designation: form.designation, location: form.location ?? '',
        operationsCategory: form.operationsCategory, managerEmpCode: form.managerEmpCode ?? '', managerName: form.managerName,
        status: form.status, otEligible: form.otEligible, otMultiplier: form.otMultiplier, otRatePerHour: form.otRatePerHour, notes: form.notes,
        bankName: form.bankName, bankAccount: form.bankAccount, ifscCode: form.ifscCode, panNumber: form.panNumber,
        aadhaarNumber: form.aadhaarNumber, uanNumber: form.uanNumber, esiNumber: form.esiNumber,
      };
      // Only send salary inputs when the user actually changed them.
      if (JSON.stringify(salaryInputs) !== initialSalaryKey) Object.assign(payload, salaryInputs);
      const updated = await api.updateEmployeeProfile(empCode, payload);
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Failed to save profile'));
    } finally {
      setSaving(false);
    }
  };

  const text = (label: string, key: keyof EmployeeProfile, type = 'text', extra = '') => (
    <div className={extra}>
      <label className="block text-xs font-medium text-slate-700 mb-1">{label}</label>
      <input type={type} value={(form[key] as string | number | undefined) ?? ''} onChange={(e) => set(key, e.target.value as never)} className={cls} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 bg-[#011638] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold border border-white/20">{empCode.slice(-3)}</div>
            <div>
              <h3 className="font-heading font-bold text-base leading-tight">Employee Profile & Salary Breakup (Annexure K)</h3>
              <p className="text-xs text-slate-300">Emp ID: <span className="font-mono font-bold text-white">{empCode}</span> • {form.name || 'Staff Member'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading employee details...</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
            {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">{error}</div>}

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-[#1184b0]" /> Personal</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {text('Full Name', 'name', 'text', 'md:col-span-2')}
                {text('Date of Birth', 'dob', 'date')}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Gender</label>
                  <select value={form.gender ?? ''} onChange={(e) => set('gender', (e.target.value || undefined) as EmployeeProfile['gender'])} className={cls}>
                    <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                {text('Email', 'email', 'email', 'md:col-span-2')}
                {text('Phone', 'phone', 'tel')}
                {text('Emergency Contact', 'emergencyContact')}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-[#1184b0]" /> Employment</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {text('Department', 'department')}
                {text('Designation', 'designation')}
                {text('Date of Joining', 'doj', 'date')}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Work Location</label>
                  <select value={form.location ?? ''} onChange={(e) => set('location', e.target.value || undefined)} className={cls}>
                    <option value="">—</option>
                    {sites.map((s) => (<option key={s.siteId} value={s.siteId}>{s.displayName}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                  <select value={form.status ?? 'active'} onChange={(e) => set('status', e.target.value as EmployeeProfile['status'])} className={cls}>
                    <option value="active">Active</option><option value="inactive">Inactive</option><option value="resigned">Resigned</option>
                  </select>
                </div>
                {text('Manager Emp Code', 'managerEmpCode')}
                {text('Operations Category', 'operationsCategory', 'text', 'md:col-span-2')}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5 text-[#1184b0]" /> Salary structure (computed by the server)</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Monthly CTC (₹)</label>
                  <input type="number" min={0} value={ctc} onChange={(e) => setCtc(e.target.value)} className={cls} placeholder="e.g. 30000" />
                </div>
                <p className="md:col-span-3 text-[11px] text-slate-500">
                  Enter the CTC and the server derives every component below. Type a value in a field to override it for this employee. Changing the CTC recomputes any component you have not overridden.
                </p>
              </div>
              {previewError && <p className="text-xs text-rose-600">{previewError}</p>}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {SALARY_KEYS.map((k) => (
                  <div key={k}>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">{SALARY_LABELS[k]}</label>
                    <input
                      type="number" min={0}
                      value={overrides[k] ?? ''}
                      onChange={(e) => setOverrides((o) => ({ ...o, [k]: e.target.value }))}
                      placeholder={preview ? String(preview[k]) : '—'}
                      className={cls}
                    />
                  </div>
                ))}
              </div>
              {preview && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {([
                    ['Gross Salary (D)', preview.grossSalary], ['Net before PT (G)', preview.totalNetSalary],
                    ['Annual CTC', preview.annualCtc], ['Monthly CTC (L)', preview.monthlyCtc],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-medium">{label}</span>
                      <span className="font-extrabold text-slate-900">{inr(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[#1184b0]" /> Overtime</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <input type="checkbox" checked={form.otEligible !== false} onChange={(e) => set('otEligible', e.target.checked)} /> Eligible for overtime pay
                </label>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">OT multiplier (x hourly wage)</label>
                  <input type="number" min={0} step="0.25" value={form.otMultiplier ?? ''} onChange={(e) => set('otMultiplier', e.target.value === '' ? undefined : Number(e.target.value))} className={cls} placeholder="default 2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fixed OT rate (₹ / hour)</label>
                  <input type="number" min={0} value={form.otRatePerHour ?? ''} onChange={(e) => set('otRatePerHour', e.target.value === '' ? undefined : Number(e.target.value))} className={cls} placeholder="optional, overrides multiplier" />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-[#1184b0]" /> Bank & statutory</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {text('Bank Name', 'bankName')}
                {text('Account Number', 'bankAccount')}
                {text('IFSC', 'ifscCode')}
                {text('PAN', 'panNumber')}
                {text('Aadhaar (12 digits)', 'aadhaarNumber')}
                {text('UAN', 'uanNumber')}
                {text('ESI IP Number', 'esiNumber')}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#1184b0] to-[#011638] rounded-xl flex items-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
