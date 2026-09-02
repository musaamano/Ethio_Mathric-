/**
 * AdminLayout.jsx
 * Admin panel layout — separate from student dashboard.
 * Dark primary sidebar with all admin routes.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../common/Toast';
import { fullName, initials } from '../../utils/helpers';

const ADMIN_NAV = [
  {
    section: 'Overview',
    items: [
      { label: 'Dashboard',     to: '/admin',                icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    ],
  },
  {
    section: 'Content',
    items: [
      { label: 'Questions',      to: '/admin/questions',           icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { label: '🤖 AI Import',   to: '/admin/questions/import-ai', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
      { label: 'Import History', to: '/admin/questions/import-logs',icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
      { label: 'Subjects',      to: '/admin/subjects',       icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
      { label: 'Announcements', to: '/admin/announcements',  icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
    ],
  },
  {
    section: 'Users & Payments',
    items: [
      { label: 'Users',         to: '/admin/users',          icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
      { label: 'Payments',      to: '/admin/payments',       icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
      { label: 'Reports',       to: '/admin/reports',        icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    ],
  },
  {
    section: 'System',
    items: [
      { label: 'Analytics',     to: '/admin/analytics',      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { label: 'Settings',      to: '/admin/settings',       icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    ],
  },
];

function AdminNavItem({ item, collapsed, onClick }) {
  const location = useLocation();
  const isActive = location.pathname === item.to ||
    (item.to !== '/admin' && location.pathname.startsWith(item.to));

  return (
    <Link
      to={item.to}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 group relative
        ${isActive
          ? 'bg-white/20 text-white shadow-inner backdrop-blur-sm'
          : 'text-white/60 hover:bg-white/10 hover:text-white'
        }
        ${collapsed ? 'justify-center' : ''}
      `}
    >
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
      </svg>
      {!collapsed && <span className="text-sm font-semibold truncate">{item.label}</span>}
      {isActive && !collapsed && (
        <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
      )}
      {collapsed && (
        <div className="absolute left-full ml-3 px-3 py-1.5 bg-primary-900 text-white text-xs font-semibold rounded-xl
          opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
          {item.label}
        </div>
      )}
    </Link>
  );
}

function AdminSidebar({ collapsed, setCollapsed, isMobile, onClose }) {
  const { user, logout } = useAuth();
  const toast            = useToast();
  const navigate         = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <aside className={`
      flex flex-col bg-primary-600 transition-all duration-300
      ${isMobile ? 'w-72' : collapsed ? 'w-[72px]' : 'w-64'}
      h-full
    `}>
      {/* Header */}
      <div className={`flex items-center h-16 px-4 border-b border-white/10 flex-shrink-0 ${collapsed && !isMobile ? 'justify-center' : 'gap-3'}`}>
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 border border-white/20">
          <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        {(!collapsed || isMobile) && (
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-white text-sm leading-tight">Admin Panel</div>
            <div className="text-[9px] font-medium text-white/50 tracking-widest uppercase">Ethio Matric</div>
          </div>
        )}
        {isMobile && (
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/10 text-white/60">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
        {!isMobile && (
          <button onClick={() => setCollapsed(c => !c)} className="p-1.5 rounded-xl hover:bg-white/10 text-white/50 ml-auto">
            <svg className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {ADMIN_NAV.map(section => (
          <div key={section.section}>
            {(!collapsed || isMobile) && (
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 mb-2">
                {section.section}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => (
                <AdminNavItem key={item.to} item={item} collapsed={collapsed && !isMobile} onClick={isMobile ? onClose : undefined} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={`border-t border-white/10 p-3 flex-shrink-0 ${collapsed && !isMobile ? 'flex justify-center' : 'flex items-center gap-3'}`}>
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {initials(fullName(user))}
        </div>
        {(!collapsed || isMobile) && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{fullName(user)}</p>
              <p className="text-[10px] text-white/40 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button onClick={handleLogout} className="p-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-all" title="Logout">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }) {
  const [collapsed,  setCollapsed]  = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  const pageTitle = ADMIN_NAV
    .flatMap(s => s.items)
    .find(i => location.pathname === i.to || (i.to !== '/admin' && location.pathname.startsWith(i.to)))?.label || 'Admin';

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} isMobile={false} />
      </div>

      {/* Mobile overlay */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setDrawerOpen(false)} />
      )}

      {/* Mobile drawer */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 flex-shrink-0 transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <AdminSidebar isMobile onClose={() => setDrawerOpen(false)} />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Admin topbar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center px-4 gap-4 flex-shrink-0">
          <button onClick={() => setDrawerOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          <h1 className="font-display font-bold text-lg text-gray-800 hidden sm:block">{pageTitle}</h1>

          <div className="flex-1" />

          {/* Back to student view */}
          <Link to="/dashboard" className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-mint-light text-primary-600 text-xs font-semibold hover:bg-mint-dark/30 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            Student View
          </Link>

          <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 text-xs font-bold border border-primary-100">
            {initials(fullName(user))}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
