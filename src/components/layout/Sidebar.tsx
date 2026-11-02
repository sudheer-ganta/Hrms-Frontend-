import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck2,
  Users,
  History,
  Settings,
  Building2,
  PartyPopper,
  UserCheck,
  UserPlus,
  Calculator,
  PiggyBank,
  ClipboardCheck,
  X
} from 'lucide-react';
import { AttendanceSource } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  sources: AttendanceSource[];
  isCollapsed?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ sources, isOpen = false, onClose }) => {
  const { user, isSuperAdmin, isFounder, isHr, isEmployee } = useAuth();

  type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; iconColor: string };
  type NavGroup = { heading: string; items: NavItem[] };

  const holidaysItem: NavItem = { to: '/holidays', label: 'Holidays', icon: PartyPopper, iconColor: 'text-purple-500' };

  // Employee-only navigation
  const employeeGroups: NavGroup[] = [
    {
      heading: 'My Work',
      items: [
        { to: '/my-dashboard', label: 'My Day', icon: LayoutDashboard, iconColor: 'text-sky-500' },
        { to: '/portal', label: 'My Attendance & Payslip', icon: UserCheck, iconColor: 'text-[#1184b0]' },
        holidaysItem,
      ],
    },
  ];

  // Everyday screens first, in plain words. Pay and staff screens sit under their own heading.
  const dailyItems = (dashboardLabel: string): NavItem[] => [
    { to: '/', label: dashboardLabel, icon: LayoutDashboard, iconColor: 'text-[#1184b0]' },
    { to: '/attendance', label: 'Attendance', icon: CalendarCheck2, iconColor: 'text-[#1184b0]' },
    { to: '/approvals', label: 'Leave Requests', icon: ClipboardCheck, iconColor: 'text-amber-500' },
    holidaysItem,
  ];

  const payrollItems: NavItem[] = [
    { to: '/employees', label: 'Employees & Salary', icon: Users, iconColor: 'text-emerald-500' },
    { to: '/portal', label: 'Employee Details', icon: UserCheck, iconColor: 'text-sky-600' },
    { to: '/ot-calculator', label: 'Overtime Pay', icon: Calculator, iconColor: 'text-indigo-500' },
    { to: '/pf-deductions', label: 'PF Deductions', icon: PiggyBank, iconColor: 'text-teal-500' },
  ];

  const systemItems: NavItem[] = [
    { to: '/sync-history', label: 'Machine Sync Log', icon: History, iconColor: 'text-amber-500' },
    { to: '/settings', label: 'Settings', icon: Settings, iconColor: 'text-slate-500' },
    { to: '/user-management', label: 'Users & Logins', icon: UserPlus, iconColor: 'text-brand-600' },
  ];

  const founderGroups: NavGroup[] = [
    { heading: 'Daily Work', items: dailyItems('Today') },
    { heading: 'Staff & Pay', items: payrollItems },
  ];

  // Super Admin keeps every screen. Settings, sync log and user management stay with the admin roles on the server.
  const superAdminGroups: NavGroup[] = [...founderGroups, { heading: 'Admin', items: systemItems }];

  const navGroups = isEmployee ? employeeGroups : isSuperAdmin ? superAdminGroups : founderGroups;

  const handleNavClick = () => {
    // Close mobile drawer on nav click
    if (onClose) onClose();
  };

  const sidebarContent = (
    <aside className="w-[268px] bg-white/95 backdrop-blur-md border-r border-slate-200/80 flex flex-col shrink-0 h-full select-none shadow-sm z-30 justify-between">
      <div>
        {/* Brand Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#011638] to-[#1184b0] flex items-center justify-center shadow-md shadow-[#1184b0]/30 text-white font-heading font-extrabold text-lg shrink-0">
              CM
            </div>
            <div className="min-w-0">
              <h1 className="font-heading font-bold tracking-wide text-slate-900 flex items-center gap-1.5 text-sm whitespace-nowrap">
                ColorMyles <span className="text-[9px] bg-[#1184b0]/15 text-[#1184b0] font-semibold px-1.5 py-0.5 rounded-full">HRMS</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium truncate">
                {isEmployee ? 'Employee' : isHr ? 'HR' : isFounder ? 'Founder' : 'Admin'}
              </p>
            </div>
          </div>
          {/* Mobile close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all shrink-0"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <div className="px-3 py-5 space-y-1">
          {navGroups.map((group, gi) => (
            <div key={group.heading} className={gi === 0 ? 'space-y-1' : 'pt-4 space-y-1'}>
              <p className="px-3 text-xs font-bold tracking-wide text-slate-400 mb-1.5">{group.heading}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to + item.label}
                    to={item.to}
                    end={item.to === '/' || item.to === '/my-dashboard'}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `nav-link flex items-center px-3.5 py-3 rounded-xl text-sm font-medium transition-all gap-3 ${
                        isActive
                          ? 'bg-gradient-to-r from-[#1184b0] to-[#011638] text-white font-semibold shadow-md shadow-[#1184b0]/25'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-white' : item.iconColor}`} />
                        <span className="whitespace-nowrap truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}

          {/* Location Status Indicators (Only for Founders & Super Admin) */}
          {!isEmployee && (
            <>
              <div className="pt-5 px-3 pb-1.5 text-xs font-bold tracking-wide text-slate-400">
                Office Locations
              </div>
              <div className="space-y-1">
                {sources.map((src) => (
                  <div
                    key={src.id}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors text-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-3.5 h-3.5 text-[#1184b0]" />
                      <span className="font-semibold text-slate-700">{src.name}</span>
                    </div>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        src.status === 'connected'
                          ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                          : src.status === 'failed' || src.status === 'credentials_missing'
                          ? 'bg-rose-500'
                          : 'bg-amber-400'
                      }`}
                      title={src.status === 'connected' ? 'Working' : src.status === 'failed' || src.status === 'credentials_missing' ? 'Not working' : 'Waiting'}
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
        <p className="text-xs text-slate-500">
          {user?.role === 'SUPER_ADMIN' ? 'Signed in as Admin' : user?.role === 'FOUNDER' ? 'Signed in as Founder' : user?.role === 'HR' ? 'Signed in as HR' : `Employee #${user?.empCode || 'User'}`}
        </p>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar: always visible on lg+ */}
      <div className="hidden lg:flex h-screen sticky top-0">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          aria-modal="true"
          role="dialog"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Drawer panel */}
          <div className="absolute inset-y-0 left-0 flex h-full animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
