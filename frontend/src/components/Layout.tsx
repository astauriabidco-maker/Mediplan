import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Settings,
  Bell,
  User,
  LogOut,
  Award,
  Smartphone,
  HeartPulse,
  Wifi,
  ChevronRight,
  ChevronDown,
  List,
  Layers,
  Network,
  MessageSquare,
  Clock,
  ShieldCheck,
  ClipboardCheck,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { useAppConfig } from '../store/useAppConfig';
import { useAuth } from '../store/useAuth';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import React, { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import NotificationBell from './NotificationBell';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SidebarItem = ({
  to,
  icon: Icon,
  label,
  themeColor,
  isSubItem = false,
}: {
  to: string;
  icon: any;
  label: string;
  themeColor: string;
  isSubItem?: boolean;
}) => (
  <NavLink
    to={to}
    end={to === '/agents' || to === '/manager'}
    className={({ isActive }) =>
      cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group mx-2',
        isActive
          ? `bg-white/10 text-white shadow-lg`
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
        isSubItem && 'pl-11 py-2 text-sm',
      )
    }
  >
    {({ isActive }) => (
      <>
        {!isSubItem && (
          <div
            className={cn(
              'p-2 rounded-lg transition-colors',
              isActive
                ? `bg-${themeColor}/20 text-${themeColor}`
                : 'bg-slate-800 text-slate-500 group-hover:text-slate-300',
            )}
          >
            <Icon size={18} />
          </div>
        )}
        {isSubItem && (
          <div
            className={cn(
              'w-1 h-1 rounded-full',
              isActive ? `bg-${themeColor}` : 'bg-slate-600',
            )}
          />
        )}
        <span className="font-medium">{label}</span>
        {isActive && !isSubItem && (
          <div
            className={cn(
              'ml-auto w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]',
              `bg-${themeColor}`,
            )}
          />
        )}
      </>
    )}
  </NavLink>
);

const SidebarGroup = ({
  icon: Icon,
  label,
  themeColor,
  children,
  activePaths,
}: {
  icon: any;
  label: string;
  themeColor: string;
  children: React.ReactNode;
  activePaths: string[];
}) => {
  const location = useLocation();
  const isExpanded = activePaths.some((path) =>
    location.pathname.startsWith(path),
  );
  const [open, setOpen] = useState(isExpanded);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-[calc(100%-16px)] flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group mx-2',
          isExpanded
            ? 'text-white'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
        )}
      >
        <div
          className={cn(
            'p-2 rounded-lg transition-colors',
            isExpanded
              ? `bg-${themeColor}/20 text-${themeColor}`
              : 'bg-slate-800 text-slate-500 group-hover:text-slate-300',
          )}
        >
          <Icon size={18} />
        </div>
        <span className="font-medium flex-1 text-left">{label}</span>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {open && (
        <div className="animate-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

export const Layout = () => {
  const { region, themeColor } = useAppConfig();
  const { user, logout, impersonatedTenantId, setImpersonatedTenantId } =
    useAuth();
  useNotifications();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const isAdminOrManager =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGER';
  const hasPermission = (perm: string) =>
    user?.permissions?.includes('*') ||
    user?.permissions?.includes(perm) ||
    isAdminOrManager;

  const isAgent = user?.role === 'AGENT';

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <div
              className={cn(
                'w-3 h-3 rounded-full bg-current',
                `text-${themeColor}`,
              )}
            />
            MEDIPLAN
          </h1>
        </div>

        <nav className="flex-1 mt-6 space-y-1 overflow-y-auto">
          {!isAgent && (
            <SidebarItem
              to="/dashboard"
              icon={LayoutDashboard}
              label="Tableau de bord"
              themeColor={themeColor}
            />
          )}
          {!isAgent && hasPermission('planning:read') && (
            <SidebarItem
              to="/manager/cockpit"
              icon={ClipboardCheck}
              label="Cockpit manager"
              themeColor={themeColor}
            />
          )}
          {!isAgent && hasPermission('planning:read') && (
            <SidebarItem
              to="/manager/worklist"
              icon={AlertTriangle}
              label="Corrections"
              themeColor={themeColor}
            />
          )}
          {!isAgent && hasPermission('audit:read') && (
            <SidebarItem
              to="/audit"
              icon={FileText}
              label="Journal audit"
              themeColor={themeColor}
            />
          )}

          <SidebarItem
            to="/planning"
            icon={Calendar}
            label="Planning"
            themeColor={themeColor}
          />
          {!isAgent && hasPermission('planning:read') && (
            <SidebarItem
              to="/planning/prepublication"
              icon={ShieldCheck}
              label="Pré-publication"
              themeColor={themeColor}
            />
          )}
          <SidebarItem
            to="/attendance"
            icon={Clock}
            label={isAgent ? 'Mes Pointages' : 'Assiduité'}
            themeColor={themeColor}
          />
          <SidebarItem
            to="/leaves"
            icon={Calendar}
            label={isAgent ? 'Mes Congés' : 'Congés'}
            themeColor={themeColor}
          />

          {!isAgent && (
            <SidebarGroup
              icon={User}
              label="Agents"
              themeColor={themeColor}
              activePaths={['/agents']}
            >
              <SidebarItem
                to="/agents"
                icon={List}
                label="Liste des Agents"
                themeColor={themeColor}
                isSubItem
              />
              <SidebarItem
                to="/agents/services"
                icon={Layers}
                label="Services"
                themeColor={themeColor}
                isSubItem
              />
              <SidebarItem
                to="/agents/hierarchy"
                icon={Network}
                label="Hiérarchie"
                themeColor={themeColor}
                isSubItem
              />
            </SidebarGroup>
          )}

          {!isAgent && (
            <SidebarItem
              to="/competencies"
              icon={Award}
              label="Compétences"
              themeColor={themeColor}
            />
          )}
          {!isAgent && (
            <SidebarItem
              to="/payment"
              icon={Smartphone}
              label="Facturation & Paies"
              themeColor={themeColor}
            />
          )}

          <SidebarItem
            to="/ged"
            icon={Layers}
            label={isAgent ? 'Mes Documents' : 'GED & Documents'}
            themeColor={themeColor}
          />

          {!isAgent && (
            <SidebarItem
              to="/qvt"
              icon={HeartPulse}
              label="Santé & QVT"
              themeColor={themeColor}
            />
          )}
          {!isAgent && hasPermission('release:read') && (
            <SidebarItem
              to="/admin/release"
              icon={ShieldCheck}
              label="Release readiness"
              themeColor={themeColor}
            />
          )}
          {!isAgent && (
            <SidebarItem
              to="/sync"
              icon={Wifi}
              label="Synchronisation"
              themeColor={themeColor}
            />
          )}
          {!isAgent && (
            <SidebarItem
              to="/whatsapp-inbox"
              icon={MessageSquare}
              label="Messages WhatsApp"
              themeColor={themeColor}
            />
          )}

          {!isAgent && hasPermission('settings:all') && (
            <SidebarItem
              to="/settings"
              icon={Settings}
              label="Paramètres"
              themeColor={themeColor}
            />
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                <User size={16} />
              </div>
              <div className="text-xs">
                <p className="font-medium text-slate-200 truncate max-w-[100px]">
                  {user?.email || 'Agent'}
                </p>
                <p className="text-slate-500">{user?.role || 'Connecté'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Déconnexion"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header
          className={cn(
            'h-16 flex items-center justify-between px-8 border-b border-white/10',
            `bg-${themeColor}`,
          )}
        >
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white uppercase tracking-wider">
              SaaS Hospitalier
            </h2>
            {impersonatedTenantId && (
              <div className="flex items-center gap-3 bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded-xl animate-pulse">
                <ShieldCheck size={16} className="text-red-400" />
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest leading-none">
                  ADMIN: {impersonatedTenantId}
                </span>
                <button
                  onClick={() => setImpersonatedTenantId(null)}
                  className="px-2 py-0.5 bg-red-500 text-white text-[9px] font-black rounded hover:bg-red-600 transition"
                >
                  QUITTER
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
              <span className="text-xs font-bold text-white">{region}</span>
            </div>

            <NotificationBell />
            <div className="w-8 h-8 rounded-full border border-white/30 bg-white/10 overflow-hidden" />
          </div>
        </header>

        {/* Scrollable Area */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
