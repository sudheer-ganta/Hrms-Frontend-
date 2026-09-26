import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck2,
  Fingerprint,
  Users,
  History,
  Settings,
  Building2,
  ShieldCheck,
  PartyPopper,
  UserCheck,
  UserPlus,
  Crown,
  FileSpreadsheet,
  Clock
} from 'lucide-react';
import { AttendanceSource } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  sources: AttendanceSource[];
  isCollapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ sources }) => {
  const { user, isSuperAdmin, isFounder, isEmployee } = useAuth();

  // Employee-only navigation
  const employeeNavItems = [
    {
      to: '/my-dashboard',
      label: 'My Dashboard',
      icon: LayoutDashboard,
      iconColor: 'text-sky-500',
      badge: 'Overview',
    },
    {
      to: '/portal',
      label: 'My ESS Portal',
      icon: UserCheck,
      iconColor: 'text-[#1184b0]',
      badge: 'Punches & Pay',
    },
    {
      to: '/holidays',
      label: 'Corporate Holidays',
      icon: PartyPopper,
      iconColor: 'text-purple-500',
      badge: 'Paid',
    },
  ];

  // Executive Management navigation (Founders & Super Admin)
  const managementNavItems = [
    {
      to: '/',
      label: 'Executive Dashboard',
      icon: LayoutDashboard,
      iconColor: 'text-[#1184b0]',
      badge: undefined,
    },
    {
      to: '/attendance',
      label: 'Daily Attendance',
      icon: CalendarCheck2,
      iconColor: 'text-[#1184b0]',
      badge: 'In/Out',
    },
    {
      to: '/raw-swipes',
      label: 'Raw Biometric Swipes',
      icon: Fingerprint,
      iconColor: 'text-violet-500',
      badge: undefined,
    },
    {
      to: '/employees',
      label: 'Employees & CTC',
      icon: Users,
      iconColor: 'text-emerald-500',
      badge: undefined,
    },
    {
      to: '/holidays',
      label: 'Corporate Holidays',
      icon: PartyPopper,
      iconColor: 'text-purple-500',
      badge: 'Paid',
    },
    {
      to: '/portal',
      label: 'Employee ESS Portal',
      icon: UserCheck,
      iconColor: 'text-sky-600',
      badge: 'Self-Service',
    },
    {
      to: '/sync-history',
      label: 'Sync History',
      icon: History,
      iconColor: 'text-amber-500',
      badge: undefined,
    },
    {
      to: '/settings',
      label: 'Settings & Policy',
      icon: Settings,
      iconColor: 'text-slate-500',
      badge: undefined,
    },
  ];

  // Super Admin Exclusive Item
  const superAdminItem = {
    to: '/user-management',
    label: 'User Management',
    icon: UserPlus,
    iconColor: 'text-amber-500',
    badge: 'Admin',
  };

  const navItems = isEmployee 
    ? employeeNavItems 
    : isSuperAdmin 
    ? [...managementNavItems, superAdminItem] 
    : managementNavItems;

  return (
    <aside className="w-64 bg-white/95 backdrop-blur-md border-r border-slate-200/80 flex flex-col shrink-0 h-screen sticky top-0 select-none shadow-sm z-30 justify-between">
      <div>
        {/* Brand Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#011638] to-[#1184b0] flex items-center justify-center shadow-md shadow-[#1184b0]/30 text-white font-heading font-extrabold text-lg">
              CM
            </div>
            <div>
              <h1 className="font-heading font-bold tracking-wide text-slate-900 flex items-center gap-1.5 text-sm">
                ColorMyles <span className="text-[9px] bg-[#1184b0]/15 text-[#1184b0] font-semibold px-1.5 py-0.5 rounded-full">HRMS</span>
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                {isEmployee ? 'Employee Portal' : isFounder ? 'Founder Console' : 'Super Admin Suite'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="px-3 py-6 space-y-1.5">
          <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">
            {isEmployee ? 'My Workplace' : 'Management'}
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/' || item.to === '/my-dashboard'}
                className={({ isActive }) =>
                  `nav-link flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#1184b0] to-[#011638] text-white font-semibold shadow-md shadow-[#1184b0]/25'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center space-x-3">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-white' : item.iconColor
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.badge === 'Admin'
                            ? 'bg-amber-100 text-amber-800 font-bold'
                            : 'bg-sky-100 text-[#1184b0]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

          {/* Location Status Indicators (Only for Founders & Super Admin) */}
          {!isEmployee && (
            <>
              <div className="pt-6 px-3 pb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Biometric Locations
              </div>
              <div className="space-y-1">
                {sources.map((src) => (
                  <div
                    key={src.id}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-3.5 h-3.5 text-[#1184b0]" />
                      <span className="font-semibold text-slate-700">{src.name}</span>
                    </div>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        src.status === 'connected' || src.status === 'ready'
                          ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                          : 'bg-amber-400'
                      }`}
                      title={src.status}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/80">
        <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
          <span className="flex items-center gap-1.5 font-medium text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Atlas DB
          </span>
          <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-semibold">
            Connected
          </span>
        </div>
        <p className="text-[10px] text-slate-400">
          {user?.role === 'SUPER_ADMIN' ? 'Root Super Admin' : user?.role === 'FOUNDER' ? 'Founder Account' : `Employee #${user?.empCode || 'User'}`}
        </p>
      </div>
    </aside>
  );
};
