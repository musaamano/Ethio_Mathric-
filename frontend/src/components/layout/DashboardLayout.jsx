/**
 * DashboardLayout.jsx
 * Full student dashboard layout:
 * - Collapsible sidebar (desktop)
 * - Responsive drawer (mobile)
 * - Topbar with search, notification bell, profile menu
 * - Active route highlighting
 */
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../common/Toast';
import { fullName, initials } from '../../utils/helpers';

import DarkModeToggle from '../common/DarkModeToggle';

// ── Nav items ─────────────────────────────────────────────
const NAV_ITEMS = [
  {
    section: 'Menu',
    items: [
      { label: 'Home',                to: '/dashboard',            icon: 'grid'      },
      { label: 'Practice',            to: '/dashboard/practice',   icon: 'bolt'      },
      { label: 'Past-Year Questions', to: '/dashboard/past-year',  icon: 'calendar'  },
      { label: 'My Progress',         to: '/dashboard/analytics',  icon: 'chart'     },
      { label: 'Profile',             to: '/dashboard/profile',    icon: 'user'      },
    ],
  },
];

// ── Icon map ──────────────────────────────────────────────
function NavIcon({ name, className = 'w-5 h-5' }) {
  const icons = {
    grid:      <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    book:      <><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>,
    bolt:      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>,
    clipboard: <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></>,
    calendar:  <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    chart:     <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    clock:     <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    trophy:    <><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47 1-1.05 1H7c-.55 0-1-.45-1-1v-2.66"/><path d="M14 14.66V17c0 .55.47 1 1.05 1H17c.55 0 1-.45 1-1v-2.66"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></>,
    bookmark:  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>,
    notes:     <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
    star:      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    user:      <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    settings:  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
    bell:      <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
    logout:    <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    chevron:   <polyline points="9 18 15 12 9 6"/>,
    menu:      <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    x:         <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    search:    <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  };

  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      {icons[name]}
    </svg>
  );
}

// ── Sidebar nav item ──────────────────────────────────────
function NavItem({ item, collapsed, onClick }) {
  const location = useLocation();
  const isActive = location.pathname === item.to ||
    (item.to !== '/dashboard' && location.pathname.startsWith(item.to));

  return (
    <Link
      to={item.to}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 group relative
        ${isActive
          ? 'bg-green-gradient text-white shadow-glow-green'
          : 'text-gray-500 hover:bg-mint-light hover:text-primary-600'
        }
        ${collapsed ? 'justify-center' : ''}
      `}
    >
      <NavIcon name={item.icon} className="w-5 h-5 flex-shrink-0" />
      {!collapsed && <span className="text-sm font-semibold truncate">{item.label}</span>}

      {/* Tooltip when collapsed */}
      {collapsed && (
        <div className="absolute left-full ml-3 px-3 py-1.5 bg-primary-700 text-white text-xs font-semibold rounded-xl
          opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg">
          {item.label}
        </div>
      )}
    </Link>
  );
}

// ── Sidebar ───────────────────────────────────────────────
function Sidebar({ collapsed, setCollapsed, onClose, isMobile }) {
  const { user, logout } = useAuth();
  const toast            = useToast();
  const navigate         = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <aside className={`
      flex flex-col bg-white border-r border-mint-light/60 transition-all duration-300
      ${isMobile ? 'w-72' : collapsed ? 'w-[72px]' : 'w-64'}
      h-full
    `}>
      {/* Logo row */}
      <div className={`flex items-center h-16 px-4 border-b border-mint-light/60 flex-shrink-0 ${collapsed && !isMobile ? 'justify-center' : 'gap-3'}`}>
        <div className="w-9 h-9 rounded-xl bg-green-gradient flex items-center justify-center shadow-glow-green flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        {(!collapsed || isMobile) && (
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-primary-600 text-sm leading-tight truncate">Ethio Matric</div>
            <div className="text-[9px] font-medium text-sage-500 tracking-widest uppercase">Academy</div>
          </div>
        )}
        {/* Mobile close button */}
        {isMobile && (
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400">
            <NavIcon name="x" className="w-4 h-4" />
          </button>
        )}
        {/* Desktop collapse toggle */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1.5 rounded-xl hover:bg-mint-light text-gray-400 hover:text-primary-600 transition-all ml-auto"
          >
            <svg className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {NAV_ITEMS.map(section => (
          <div key={section.section}>
            {(!collapsed || isMobile) && (
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">
                {section.section}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => (
                <NavItem key={item.to} item={item} collapsed={collapsed && !isMobile} onClick={isMobile ? onClose : undefined} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className={`border-t border-mint-light/60 p-3 flex-shrink-0 ${collapsed && !isMobile ? 'flex justify-center' : 'flex items-center gap-3'}`}>
        {/* Avatar */}
        <Link to="/dashboard/profile" className="flex-shrink-0">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="avatar" className="w-9 h-9 rounded-xl object-cover border-2 border-mint-dark/20" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-green-gradient flex items-center justify-center text-white text-xs font-bold shadow-soft">
              {initials(fullName(user))}
            </div>
          )}
        </Link>
        {(!collapsed || isMobile) && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary-700 truncate">{fullName(user)}</p>
              <p className="text-[10px] text-gray-400 truncate capitalize">{user?.stream?.replace('_', ' ') || 'Student'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
              title="Logout"
            >
              <NavIcon name="logout" className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

// ── Topbar ────────────────────────────────────────────────
function Topbar({ onMenuClick }) {
  const { user, logout }          = useAuth();
  const toast                     = useToast();
  const navigate                  = useNavigate();
  const location                  = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const profileRef = useRef(null);
  const notifRef   = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!profileRef.current?.contains(e.target)) setProfileOpen(false);
      if (!notifRef.current?.contains(e.target))   setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Build page title from pathname
  const pageTitle = (() => {
    const map = {
      '/dashboard':            'Home',
      '/dashboard/practice':   'Practice',
      '/dashboard/past-year':  'Past-Year Questions',
      '/dashboard/analytics':  'My Progress',
      '/dashboard/profile':    'Profile',
      '/dashboard/subjects':   'Practice',
      '/dashboard/history':    'History',
      '/dashboard/leaderboard':'Leaderboard',
      '/dashboard/bookmarks':  'Bookmarks',
      '/dashboard/subscription':'Subscription',
      '/dashboard/settings':   'Settings',
    };
    return map[location.pathname] || 'Dashboard';
  })();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-mint-light/60 flex items-center px-4 gap-4 flex-shrink-0">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-xl hover:bg-mint-light text-gray-500 transition-all"
      >
        <NavIcon name="menu" className="w-5 h-5" />
      </button>

      {/* Page title */}
      <h1 className="font-display font-bold text-lg text-primary-700 hidden sm:block">{pageTitle}</h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Dark mode toggle */}
      <DarkModeToggle />

      {/* Notification Bell */}
      <div ref={notifRef} className="relative">
        <button
          onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
          className="relative p-2 rounded-xl hover:bg-mint-light text-gray-500 hover:text-primary-600 transition-all"
        >
          <NavIcon name="bell" className="w-5 h-5" />
          {/* Badge */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-warm rounded-full" />
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-12 w-80 bg-white rounded-3xl shadow-card-hover border border-mint-light/60 z-50 overflow-hidden animate-scale-in">
            <div className="p-4 border-b border-mint-light/60 flex items-center justify-between">
              <h3 className="font-display font-bold text-primary-700 text-sm">Notifications</h3>
              <span className="badge bg-warm-light text-warm-dark text-[10px]">3 new</span>
            </div>
            <div className="divide-y divide-mint-light/40 max-h-72 overflow-y-auto">
              {[
                { icon:'📢', text:"New questions available in Physics!", time:"2h ago", unread:true },
                { icon:'🎉', text:"Your subscription is active. Enjoy full access!", time:"1d ago", unread:true },
                { icon:'⚠️', text:"Your subscription expires in 7 days.", time:"2d ago", unread:false },
              ].map((n, i) => (
                <div key={i} className={`flex gap-3 p-4 hover:bg-surface cursor-pointer transition-colors ${n.unread ? 'bg-mint-light/30' : ''}`}>
                  <span className="text-xl flex-shrink-0">{n.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-snug">{n.text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                  </div>
                  {n.unread && <div className="w-2 h-2 bg-warm rounded-full mt-1.5 flex-shrink-0" />}
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-mint-light/60 text-center">
              <button className="text-xs font-semibold text-primary-600 hover:text-sage-500">View all notifications</button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Menu */}
      <div ref={profileRef} className="relative">
        <button
          onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }}
          className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-2xl hover:bg-mint-light transition-all"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="avatar" className="w-8 h-8 rounded-xl object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-green-gradient flex items-center justify-center text-white text-xs font-bold">
              {initials(fullName(user))}
            </div>
          )}
          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold text-primary-700 leading-tight">{user?.first_name}</p>
            <p className="text-[10px] text-gray-400 capitalize">{user?.role || 'student'}</p>
          </div>
          <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/>
          </svg>
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-12 w-56 bg-white rounded-3xl shadow-card-hover border border-mint-light/60 z-50 overflow-hidden animate-scale-in">
            {/* User info */}
            <div className="p-4 border-b border-mint-light/60">
              <p className="font-semibold text-primary-700 text-sm">{fullName(user)}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            {/* Menu items */}
            <div className="p-2">
              {[
                { label:'My Profile',     to:'/dashboard/profile',      icon:'user' },
                { label:'Subscription',   to:'/dashboard/subscription', icon:'star' },
                { label:'Settings',       to:'/dashboard/settings',     icon:'settings' },
              ].map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-mint-light text-sm text-gray-600 hover:text-primary-600 transition-all"
                >
                  <NavIcon name={item.icon} className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </div>
            {/* Logout */}
            <div className="p-2 border-t border-mint-light/60">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-sm text-red-500 w-full transition-all"
              >
                <NavIcon name="logout" className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

// ── Main DashboardLayout ──────────────────────────────────
export default function DashboardLayout({ children }) {
  const [collapsed,   setCollapsed]   = useState(false);
  const [drawerOpen,  setDrawerOpen]  = useState(false);

  // Close drawer on route change
  const location = useLocation();
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  return (
    <div className="flex h-screen bg-surface overflow-hidden">

      {/* ── Desktop Sidebar ── */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} isMobile={false} />
      </div>

      {/* ── Mobile Drawer overlay ── */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <div className={`
        lg:hidden fixed inset-y-0 left-0 z-50 flex-shrink-0
        transition-transform duration-300
        ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar isMobile={true} onClose={() => setDrawerOpen(false)} />
      </div>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onMenuClick={() => setDrawerOpen(true)} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
