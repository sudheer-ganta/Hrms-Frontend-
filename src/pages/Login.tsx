import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('gmsaisudheer@gmail.com');
  const [password, setPassword] = useState('gmsaisudheer@gmail');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please enter your email or employee ID and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(identifier, password);
      
      // Get stored user to determine role
      const storedUser = localStorage.getItem('etimehr_auth_user');
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;

      if (parsedUser?.role === 'EMPLOYEE') {
        navigate('/my-dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email/employee ID or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#011638] to-slate-900 flex items-center justify-center p-4 sm:p-6 text-slate-800 selection:bg-[#1184b0] selection:text-white relative overflow-hidden font-sans">
      {/* Subtle brand ambient glow */}
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-[#1184b0]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/40 rounded-3xl p-8 sm:p-10">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#011638] to-[#1184b0] text-white font-extrabold text-2xl shadow-lg shadow-[#1184b0]/25 mb-4 ring-4 ring-[#1184b0]/10">
              CM
            </div>
            <h1 className="text-2xl font-extrabold font-heading tracking-tight text-slate-900 flex items-center justify-center gap-2">
              ColorMyles <span className="text-xs bg-[#1184b0]/15 text-[#1184b0] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">HRMS</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">Enterprise Attendance, Payroll & Self-Service</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email Address or Employee ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter email (e.g. gmsaisudheer@gmail.com) or Employee ID"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1184b0] focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1184b0] focus:bg-white transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#1184b0] to-[#011638] hover:opacity-95 text-white font-bold text-xs tracking-wide uppercase transition-all shadow-lg shadow-[#1184b0]/25 flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Information */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-medium">MongoDB Atlas Cloud</span>
            </div>
            <span>3 Biometric Branches</span>
          </div>
        </div>
      </div>
    </div>
  );
};
