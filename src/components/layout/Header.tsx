import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Clock, 
  Building2,
  LogOut,
  Crown,
  Briefcase,
  User,
  Shield,
  Menu
} from 'lucide-react';
import { AttendanceSource } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onOpenSync: () => void;
  sources: AttendanceSource[];
  activeSourceId: string;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSync,
  sources,
  activeSourceId,
  onOpenMobileMenu,
}) => {
  const { user, logout, isSuperAdmin, isFounder, isEmployee } = useAuth();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }) +
          ' • ' +
          now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentSourceName =
    activeSourceId === 'all'
      ? 'All Locations'
      : sources.find((s) => s.id === activeSourceId)?.name || 'All Locations';

  return (
    <header className="h-16 border-b border-slate-200/70 px-4 sm:px-6 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20 shadow-xs font-sans">
      {/* Left: Hamburger (mobile) + Title */}
      <div className="flex items-center space-x-3">
        {/* Mobile hamburger button */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Location Breadcrumb / Title */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="hidden sm:flex p-2 rounded-xl bg-sky-50 text-[#1184b0] border border-sky-100">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-heading font-bold text-slate-900 tracking-wide block truncate max-w-[160px] sm:max-w-xs">
              {isEmployee ? `Personal Portal (${user?.name})` : currentSourceName}
            </span>
            <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">ColorMyles HRMS Cloud</span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Live Clock */}
        <div className="hidden lg:flex items-center space-x-2 text-xs bg-slate-100/90 border border-slate-200/80 px-3 py-1.5 rounded-xl text-slate-700 font-medium font-mono">
          <Clock className="w-3.5 h-3.5 text-[#1184b0]" />
          <span>{time || 'Loading...'}</span>
        </div>

        {/* Sync Now Button (Only for Founders & Super Admin) */}
        {!isEmployee && (
          <button
            onClick={onOpenSync}
            className="flex items-center space-x-1.5 sm:space-x-2 text-xs font-semibold bg-gradient-to-r from-[#1184b0] to-[#011638] hover:opacity-95 text-white px-2.5 sm:px-3.5 py-1.5 rounded-xl transition-all shadow-md shadow-[#1184b0]/20 active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sync Punches</span>
          </button>
        )}

        {/* User Profile Pill */}
        <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-xs ${
              isSuperAdmin 
                ? 'bg-gradient-to-tr from-amber-600 to-amber-400' 
                : isFounder 
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-400' 
                : 'bg-gradient-to-tr from-[#1184b0] to-sky-400'
            }`}>
              {isSuperAdmin ? <Crown className="w-4 h-4" /> : user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <span className="text-xs font-bold text-slate-900 block leading-tight truncate max-w-[130px]">
                {user?.name || 'User'}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {isSuperAdmin ? 'Super Admin' : isFounder ? 'Founder' : `#${user?.empCode || 'Employee'}`}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all border border-transparent hover:border-rose-200"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
