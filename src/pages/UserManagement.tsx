import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Users, 
  Crown, 
  Briefcase, 
  User, 
  ShieldCheck, 
  Key, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Lock,
  Mail,
  Search,
  Filter,
  Power,
  RefreshCw,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, refreshApiData } from '../services/api';
import { useDataVersion, useLastUpdatedTime } from '../services/dataSync';
import { errorMessage } from '../lib/apiError';
import type { EmployeeProfile } from '../types';
import type { User as AppUser, CreateUserInput } from '../types/auth.types';

// Plain names for the four kinds of login, and what each one can do.
const ROLE_WORDS: Record<string, string> = { SUPER_ADMIN: 'Admin (everything)', FOUNDER: 'Founder', HR: 'HR', EMPLOYEE: 'Employee' };
const ROLE_HELP: Record<string, string> = {
  EMPLOYEE: 'Sees only their own attendance, leave and salary slip.',
  FOUNDER: 'Sees all staff, attendance, salary and settings.',
  HR: 'Runs daily work: attendance, leave, overtime and salary. Cannot change settings.',
  SUPER_ADMIN: 'Full control, including settings, logins and opening a locked salary month.',
};

export const UserManagement: React.FC = () => {
  const { token } = useAuth();
  const dataVersion = useDataVersion();
  const lastUpdated = useLastUpdatedTime();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [employeesList, setEmployeesList] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<{ role: 'SUPER_ADMIN' | 'FOUNDER' | 'HR' | 'EMPLOYEE'; empCode: string; name: string; email: string; password: string }>({
    role: 'EMPLOYEE',
    empCode: '',
    name: '',
    email: '',
    password: '',
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userList, emps] = await Promise.all([
        api.getUsers(),
        api.getAllEmployees(),
      ]);

      setUsers(userList || []);
      setEmployeesList(emps || []);
    } catch (err) {
      setNotification({ type: 'error', message: errorMessage(err, 'Could not load users.') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, dataVersion]);

  const handleEmpCodeSelect = (code: string) => {
    const selectedEmp = employeesList.find((e) => e.empCode === code);
    setFormData({
      ...formData,
      empCode: code,
      name: selectedEmp ? selectedEmp.name : formData.name,
      email: selectedEmp?.email || formData.email, // never invent an address; the admin types it
    });
  };

  // Same password rules as the server (the server stays the authority); checked here so the message is short and plain.
  const passwordProblem = (password: string, email: string, empCode: string): string | null => {
    const missing: string[] = [];
    if (password.length < 10) missing.push('at least 10 characters');
    if (!/[A-Za-z]/.test(password)) missing.push('a letter');
    if (!/\d/.test(password)) missing.push('a number');
    if (missing.length) return `The password needs ${missing.join(', ')}. Example: Welcome@2026`;
    const lower = password.toLowerCase();
    const same = [email.trim().toLowerCase(), email.trim().toLowerCase().split('@')[0], empCode.trim().toLowerCase()].some((v) => v.length >= 3 && lower === v);
    if (same) return 'The password cannot be the same as the email or the employee code. Choose a different one.';
    return null;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const problem = passwordProblem(formData.password, formData.email, formData.role === 'EMPLOYEE' ? formData.empCode : '');
    if (problem) { setFormError(problem); return; }
    try {
      const payload: CreateUserInput = {
        email: formData.email.trim(),
        name: formData.name.trim() || undefined,
        password: formData.password,
        role: formData.role,
        empCode: formData.role === 'EMPLOYEE' ? formData.empCode.trim() : undefined,
      };
      await api.createUser(payload);
      setNotification({ type: 'success', message: `Login created for ${formData.name || formData.email}.` });
      setIsCreateModalOpen(false);
      setFormData({ role: 'EMPLOYEE', empCode: '', name: '', email: '', password: '' });
      loadData();
    } catch (err) {
      setFormError(errorMessage(err, 'Could not create the login.')); // shown inside the form, where the admin is looking
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await api.toggleUserStatus(userId);
      setNotification({ type: 'success', message: 'Done. The login is now switched on or off.' });
      loadData();
    } catch (err) {
      const message = errorMessage(err, 'Could not switch the login on or off.');
      alert(message);
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!window.confirm(`Delete the login for ${name} for good? They will not be able to sign in. This cannot be undone.`)) return;
    try {
      await api.deleteUser(userId);
      setNotification({ type: 'success', message: 'Login deleted.' });
      loadData();
    } catch (err) {
      const message = errorMessage(err, 'Could not delete the login.');
      alert(message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset || !newPassword) return;
    if (newPassword.length < 10 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setNotification({ type: 'error', message: 'The password needs at least 10 characters, with at least one letter and one number.' });
      return;
    }
    try {
      await api.resetUserPassword(selectedUserForReset.id, newPassword);
      setNotification({ type: 'success', message: `New password saved for ${selectedUserForReset.name}.` });
      setIsResetPassModalOpen(false);
      setNewPassword('');
    } catch (err) {
      const message = errorMessage(err, 'Could not save the new password.');
      alert(message);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.empCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const superAdminCount = users.filter((u) => u.role === 'SUPER_ADMIN').length;
  const founderCount = users.filter((u) => u.role === 'FOUNDER').length;
  const hrCount = users.filter((u) => u.role === 'HR').length;
  const employeeCount = users.filter((u) => u.role === 'EMPLOYEE').length;

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#011638] via-[#093554] to-[#1184b0] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-[#011638]/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sky-200 text-[10px] font-bold uppercase tracking-wider mb-2">
            <Crown className="w-3.5 h-3.5" /> Admin only
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading">
            Logins
          </h1>
          <p className="text-xs text-sky-100/80 mt-1 max-w-xl">
            Decide who can sign in to this system and what they can see. Make a login, change a password, or switch a login off.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-[11px] font-medium text-sky-100">
            <Clock className="w-3.5 h-3.5 text-sky-300" />
            <span>Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })} IST</span>
          </div>

          <button
            type="button"
            onClick={() => { refreshApiData(); loadData(); }}
            disabled={loading}
            className="p-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl transition-all shadow-md active:scale-95 shrink-0"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => { setFormError(null); setIsCreateModalOpen(true); }}
            className="px-5 py-3 bg-white text-[#011638] hover:bg-sky-50 text-xs font-bold rounded-2xl transition-all shadow-lg flex items-center gap-2 active:scale-95 shrink-0"
          >
            <UserPlus className="w-4 h-4 text-[#1184b0]" />
            <span>Add a login</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Everyone who can sign in</span>
          <span className="text-2xl font-extrabold text-slate-900 font-heading">{users.length} logins</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-[#1184b0] uppercase tracking-wider block mb-1 flex items-center gap-1">
            <Crown className="w-3 h-3" /> Admins
          </span>
          <span className="text-2xl font-extrabold text-slate-900 font-heading">{superAdminCount} full control</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> Founders and HR
          </span>
          <span className="text-2xl font-extrabold text-slate-900 font-heading">{founderCount} founder{founderCount === 1 ? '' : 's'}{hrCount ? ` · ${hrCount} HR` : ''}</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <User className="w-3 h-3" /> Employees
          </span>
          <span className="text-2xl font-extrabold text-slate-900 font-heading">{employeeCount} own login</span>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Search & Filter Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email or employee code..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1184b0] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none"
            >
              <option value="ALL">Everyone</option>
              <option value="SUPER_ADMIN">Admins only</option>
              <option value="FOUNDER">Founders only</option>
              <option value="HR">HR only</option>
              <option value="EMPLOYEE">Employees only</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">Person</th>
                <th className="py-3 px-5">Can do</th>
                <th className="py-3 px-5">Employee code</th>
                <th className="py-3 px-5">Login</th>
                <th className="py-3 px-5 text-right">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        u.role === 'SUPER_ADMIN'
                          ? 'bg-[#1184b0]/15 text-[#1184b0]'
                          : u.role === 'FOUNDER'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}>
                        {u.role === 'SUPER_ADMIN' ? <Crown className="w-4 h-4 text-[#1184b0]" /> : u.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{u.name}</span>
                        <span className="text-[11px] text-slate-500 font-medium">{u.email}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      u.role === 'SUPER_ADMIN'
                        ? 'bg-[#1184b0]/15 text-[#1184b0] border border-[#1184b0]/30'
                        : u.role === 'FOUNDER'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : u.role === 'HR'
                        ? 'bg-violet-100 text-violet-800 border border-violet-200'
                        : 'bg-sky-100 text-sky-800 border border-sky-200'
                    }`}>
                      {u.role === 'SUPER_ADMIN' && <Crown className="w-3 h-3 text-[#1184b0]" />}
                      {u.role === 'FOUNDER' && <Briefcase className="w-3 h-3 text-emerald-600" />}
                      {u.role === 'HR' && <Briefcase className="w-3 h-3 text-violet-600" />}
                      {u.role === 'EMPLOYEE' && <User className="w-3 h-3 text-sky-600" />}
                      <span>{ROLE_WORDS[u.role] ?? u.role}</span>
                    </span>
                  </td>

                  <td className="py-3.5 px-5 font-mono font-semibold text-slate-700">
                    {u.empCode ? (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        #{u.empCode}
                      </span>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>

                  <td className="py-3.5 px-5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span>{u.status === 'active' ? 'Switched on' : 'Switched off'}</span>
                    </span>
                  </td>

                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    {u.role !== 'SUPER_ADMIN' && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          title="Set a new password"
                          onClick={() => {
                            setSelectedUserForReset(u);
                            setIsResetPassModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-[#1184b0] transition-colors"
                        >
                          <Key className="w-4 h-4" />
                        </button>

                        <button
                          title="Switch this login on or off"
                          onClick={() => handleToggleStatus(u.id)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                          <Power className="w-4 h-4" />
                        </button>

                        <button
                          title="Delete this login"
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Account Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-scale-in border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1 font-heading">Add a login</h3>
            <p className="text-xs text-slate-500 mb-5">Make a login so this person can sign in</p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">What can this person do?</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'EMPLOYEE' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      formData.role === 'EMPLOYEE'
                        ? 'bg-sky-50 border-sky-500 text-sky-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <User className="w-3.5 h-3.5 text-sky-600" />
                    <span>Employee</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'FOUNDER', empCode: '' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      formData.role === 'FOUNDER'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Founder</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'HR', empCode: '' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      formData.role === 'HR'
                        ? 'bg-violet-50 border-violet-500 text-violet-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5 text-violet-600" />
                    <span>HR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'SUPER_ADMIN', empCode: '' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      formData.role === 'SUPER_ADMIN'
                        ? 'bg-amber-50 border-amber-500 text-amber-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                    <span>Admin</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">{ROLE_HELP[formData.role]}</p>
              </div>

              {formData.role === 'EMPLOYEE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Which employee is this?
                  </label>
                  <select
                    value={formData.empCode}
                    onChange={(e) => handleEmpCodeSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1184b0] focus:outline-none"
                    required
                  >
                    <option value="">-- Choose the employee --</option>
                    {employeesList.map((emp) => (
                      <option key={emp.empCode} value={emp.empCode}>
                        #{emp.empCode} - {emp.name} ({emp.location || 'Budigere'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full name"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1184b0] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email (they sign in with this)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. employee@colormyles.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1184b0] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password (you tell it to them)</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => { setFormError(null); setFormData({ ...formData, password: e.target.value }); }}
                  placeholder="At least 10 characters, letters and digits" autoComplete="new-password" minLength={10}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1184b0] focus:outline-none"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">At least 10 characters with a letter and a number, and not the same as the email or employee code. They will be asked to change it when they first sign in.</p>
              </div>

              {formError && (
                <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">{formError}</div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-[#1184b0] to-[#011638] text-white rounded-xl shadow-md"
                >
                  Create login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetPassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-scale-in border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1 font-heading">Set a new password</h3>
            <p className="text-xs text-slate-500 mb-4">
              Type a new password for <span className="font-bold text-slate-800">{selectedUserForReset?.name}</span>
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 10 characters, letters and digits" autoComplete="new-password" minLength={10}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1184b0] focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetPassModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-[#1184b0] to-[#011638] text-white rounded-xl shadow-md"
                >
                  Save password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
