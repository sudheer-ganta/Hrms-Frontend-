import React, { useState } from 'react';
import { Lock, Eye, EyeOff, KeyRound, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { errorMessage } from '../lib/apiError';

/**
 * Shown instead of the whole app while the signed-in user is still on a password an admin set
 * (a new account or a password reset). The server also blocks every other API call until this is done.
 */
export const ChangePasswordRequired: React.FC = () => {
  const { user, logout, completePasswordChange } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 10 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError('Your new password needs at least 10 characters, with a letter and a number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The new password and the confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Your new password must be different from the one you were given.');
      return;
    }
    try {
      setLoading(true);
      const data = await api.changePassword(currentPassword, newPassword);
      completePasswordChange(data); // the app opens as soon as the flag is cleared
    } catch (err) {
      setError(errorMessage(err, 'Could not change the password. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    'w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1184b0] focus:bg-white transition-all';

  const field = (label: string, value: string, set: (v: string) => void, autoComplete: string, placeholder: string) => (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Lock className="w-4 h-4" />
        </div>
        <input
          type={showPasswords ? 'text' : 'password'}
          value={value}
          onChange={(e) => set(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={fieldClass}
          required
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#011638] to-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md">
        <div className="bg-white/95 border border-white/20 shadow-2xl shadow-black/40 rounded-3xl p-8 sm:p-10">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#011638] to-[#1184b0] text-white shadow-lg shadow-[#1184b0]/25 mb-4 ring-4 ring-[#1184b0]/10">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Set your new password</h1>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              {user?.name ? `Hi ${user.name}. ` : ''}The password you signed in with was set by your administrator. Choose your own to continue.
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {field('Current password (the one you were given)', currentPassword, setCurrentPassword, 'current-password', 'Password you were given')}
            {field('New password', newPassword, setNewPassword, 'new-password', 'At least 10 characters, a letter and a number')}
            {field('Confirm new password', confirmPassword, setConfirmPassword, 'new-password', 'Type the new password again')}

            <button
              type="button"
              onClick={() => setShowPasswords((s) => !s)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-700"
            >
              {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPasswords ? 'Hide passwords' : 'Show passwords'}
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#1184b0] to-[#011638] hover:opacity-95 text-white font-bold text-xs tracking-wide uppercase transition-all shadow-lg shadow-[#1184b0]/25 flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save new password'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => void logout()}
            className="mt-6 w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-600"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
};
