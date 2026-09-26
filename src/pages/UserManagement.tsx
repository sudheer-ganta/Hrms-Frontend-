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
  Power
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const UserManagement: React.FC = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');

  // Form state
  const [formData, setFormData] = useState({
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
      const [resUsers, emps] = await Promise.all([
        fetch('/api/auth/users', {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
        api.getAllEmployees(),
      ]);

      if (resUsers.success) {
        setUsers(resUsers.data || []);
      }
      setEmployeesList(emps || []);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleEmpCodeSelect = (code: string) => {
    const selectedEmp = employeesList.find((e) => e.empCode === code);
    setFormData({
      ...formData,
      empCode: code,
      name: selectedEmp ? selectedEmp.name : formData.name,
      email: selectedEmp?.email || `${code.toLowerCase()}@colormyles.com`,
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create user account.');
      }

      setNotification({ type: 'success', message: `Account created successfully for ${formData.name || formData.email}!` });
      setIsCreateModalOpen(false);
      setFormData({ role: 'EMPLOYEE', empCode: '', name: '', email: '', password: '' });
      loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Creation failed.' });
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      const res = await fetch(`/api/auth/users/${userId}/toggle-status`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      setNotification({ type: 'success', message: 'User status updated.' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the login for ${name}?`)) return;
    try {
      const res = await fetch(`/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      setNotification({ type: 'success', message: 'User deleted.' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset || !newPassword) return;
    try {
      const res = await fetch(`/api/auth/users/${selectedUserForReset._id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      setNotification({ type: 'success', message: `Password reset successfully for ${selectedUserForReset.name}.` });
      setIsResetPassModalOpen(false);
      setNewPassword('');
    } catch (err: any) {
      alert(err.message || 'Failed to reset password.');
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
            <Crown className="w-3.5 h-3.5" /> Super Admin Access Control
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading">
            User Accounts & Security
          </h1>
          <p className="text-xs text-sky-100/80 mt-1 max-w-xl">
            Create and manage login access for Founders and Biometric Enrolled Employees. Linked directly with MongoDB Atlas credentials.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-3 bg-white text-[#011638] hover:bg-sky-50 text-xs font-bold rounded-2xl transition-all shadow-lg flex items-center gap-2 active:scale-95 shrink-0"
        >
          <UserPlus className="w-4 h-4 text-[#1184b0]" />
          <span>Create New Account</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total System Logins</span>
          <span className="text-2xl font-extrabold text-slate-900 font-heading">{users.length} Accounts</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-[#1184b0] uppercase tracking-wider block mb-1 flex items-center gap-1">
            <Crown className="w-3 h-3" /> Super Admin
          </span>
          <span className="text-2xl font-extrabold text-slate-900 font-heading">{superAdminCount} Root</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> Founders
          </span>
          <span className="text-2xl font-extrabold text-slate-900 font-heading">{founderCount} Active</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <User className="w-3 h-3" /> Employees
          </span>
          <span className="text-2xl font-extrabold text-slate-900 font-heading">{employeeCount} Self-Service</span>
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
                placeholder="Search user name, email, or employee code..."
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
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin Only</option>
              <option value="FOUNDER">Founders Only</option>
              <option value="EMPLOYEE">Employees Only</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">User</th>
                <th className="py-3 px-5">Role & Access Level</th>
                <th className="py-3 px-5">Linked Employee ID</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u._id} className="hover:bg-slate-50/70 transition-colors">
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
                        : 'bg-sky-100 text-sky-800 border border-sky-200'
                    }`}>
                      {u.role === 'SUPER_ADMIN' && <Crown className="w-3 h-3 text-[#1184b0]" />}
                      {u.role === 'FOUNDER' && <Briefcase className="w-3 h-3 text-emerald-600" />}
                      {u.role === 'EMPLOYEE' && <User className="w-3 h-3 text-sky-600" />}
                      <span>{u.role}</span>
                    </span>
                  </td>

                  <td className="py-3.5 px-5 font-mono font-semibold text-slate-700">
                    {u.empCode ? (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        #{u.empCode}
                      </span>
                    ) : (
                      <span className="text-slate-400">N/A</span>
                    )}
                  </td>

                  <td className="py-3.5 px-5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span className="capitalize">{u.status}</span>
                    </span>
                  </td>

                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    {u.role !== 'SUPER_ADMIN' && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          title="Reset Password"
                          onClick={() => {
                            setSelectedUserForReset(u);
                            setIsResetPassModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-[#1184b0] transition-colors"
                        >
                          <Key className="w-4 h-4" />
                        </button>

                        <button
                          title="Toggle Active/Inactive"
                          onClick={() => handleToggleStatus(u._id)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                          <Power className="w-4 h-4" />
                        </button>

                        <button
                          title="Delete Account"
                          onClick={() => handleDeleteUser(u._id, u.name)}
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
            <h3 className="text-lg font-bold text-slate-900 mb-1 font-heading">Create System Account</h3>
            <p className="text-xs text-slate-500 mb-5">Provision login credentials for Founders or Employees</p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'EMPLOYEE' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                      formData.role === 'EMPLOYEE'
                        ? 'bg-sky-50 border-sky-500 text-sky-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <User className="w-3.5 h-3.5 text-sky-600" />
                    <span>Employee Account</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'FOUNDER', empCode: '' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                      formData.role === 'FOUNDER'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Founder Account</span>
                  </button>
                </div>
              </div>

              {formData.role === 'EMPLOYEE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Enrolled Employee (Or Type Code)
                  </label>
                  <select
                    value={formData.empCode}
                    onChange={(e) => handleEmpCodeSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1184b0] focus:outline-none"
                    required
                  >
                    <option value="">-- Choose Employee from Biometric Directory --</option>
                    {employeesList.map((emp) => (
                      <option key={emp.empCode} value={emp.empCode}>
                        #{emp.empCode} - {emp.name} ({emp.location || 'Budigere'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sudheer or Founder Name"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1184b0] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Login Email</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Set initial login password..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1184b0] focus:outline-none"
                  required
                />
              </div>

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
                  Create User Login
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
            <h3 className="text-lg font-bold text-slate-900 mb-1 font-heading">Reset Password</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter a new password for <span className="font-bold text-slate-800">{selectedUserForReset?.name}</span>
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password..."
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
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
