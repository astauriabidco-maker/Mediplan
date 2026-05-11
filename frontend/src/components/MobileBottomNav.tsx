import React from 'react';
import { NavLink } from 'react-router-dom';
import { Calendar, Bell, ClipboardList, LayoutDashboard, User } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../store/useAuth';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      cn(
        'flex flex-col items-center justify-center w-full h-full space-y-1',
        isActive ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-300'
      )
    }
  >
    <Icon size={20} />
    <span className="text-[10px] font-medium">{label}</span>
  </NavLink>
);

export const MobileBottomNav = () => {
  const { user } = useAuth();
  const isAgent = user?.role === 'AGENT';

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 z-50">
      <NavItem to="/planning" icon={Calendar} label="Planning" />
      {isAgent && (
        <>
          <NavItem to="/marketplace" icon={Bell} label="Marketplace" />
          <NavItem to="/my-shifts" icon={ClipboardList} label="Mes Gardes" />
        </>
      )}
      {!isAgent && (
        <NavItem to="/manager/cockpit" icon={LayoutDashboard} label="Cockpit" />
      )}
      <NavItem to="/profile" icon={User} label="Profil" />
    </div>
  );
};
