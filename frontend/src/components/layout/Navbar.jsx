import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import DarkModeToggle from '../common/DarkModeToggle';
import { useAuth }    from '../../hooks/useAuth';

const NAV_LINKS = [
  { label: 'Home',     to: '/' },
  { label: 'Features', to: '/features' },
  { label: 'Subjects', to: '/subjects' },
  { label: 'Pricing',  to: '/pricing' },
  { label: 'About',    to: '/about' },
  { label: 'FAQ',      to: '/faq' },
  { label: 'Contact',  to: '/contact' },
];

export default function Navbar() {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const location  = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => setMenuOpen(false), [location]);

  // Lock body scroll when menu open on mobile
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const dashboardLink = isAdmin ? '/admin' : '/dashboard';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/85 dark:bg-gray-900/90 backdrop-blur-md shadow-soft border-b border-mint-light/50 dark:border-gray-800'
          : 'bg-transparent'
      }`}
    >
      <div className="section-container">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-green-gradient flex items-center justify-center shadow-glow-green group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-display font-bold text-primary-600 dark:text-sage-400 text-sm leading-tight">
                Ethio Matric
              </span>
              <span className="text-[9px] font-medium text-sage-500 leading-tight tracking-widest uppercase">
                Academy
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  location.pathname === link.to
                    ? 'bg-mint-light dark:bg-primary-900/40 text-primary-600 font-semibold'
                    : 'text-gray-600 dark:text-gray-300 hover:text-primary-600 hover:bg-mint-light/70 dark:hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="hidden lg:flex items-center gap-2">
            <DarkModeToggle />

            {isAuthenticated ? (
              <Link
                to={dashboardLink}
                className="ml-2 px-5 py-2.5 text-sm font-semibold text-white bg-green-gradient rounded-xl shadow-glow-green hover:scale-[1.02] hover:shadow-card-hover active:scale-[0.98] transition-all duration-200"
              >
                {isAdmin ? 'Admin Panel' : 'Dashboard'} →
              </Link>
            ) : (
              <>
                <Link to="/login"
                  className="px-4 py-2.5 text-sm font-semibold text-primary-600 dark:text-sage-400 hover:bg-mint-light dark:hover:bg-gray-800 rounded-xl transition-all duration-200">
                  Log In
                </Link>
                <Link to="/register"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-green-gradient rounded-xl shadow-glow-green hover:scale-[1.02] hover:shadow-card-hover active:scale-[0.98] transition-all duration-200">
                  Get Started Free
                </Link>
              </>
            )}
          </div>

          {/* Mobile: dark mode + hamburger */}
          <div className="lg:hidden flex items-center gap-2">
            <DarkModeToggle />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-xl hover:bg-mint-light dark:hover:bg-gray-800 transition-all"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <span className={`w-5 h-0.5 bg-primary-600 dark:bg-sage-400 rounded-full transition-all duration-300 origin-center ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`w-5 h-0.5 bg-primary-600 dark:bg-sage-400 rounded-full transition-all duration-300 ${menuOpen ? 'opacity-0 scale-x-0' : ''}`} />
              <span className={`w-5 h-0.5 bg-primary-600 dark:bg-sage-400 rounded-full transition-all duration-300 origin-center ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <div className={`lg:hidden fixed inset-0 z-40 transition-all duration-300 ${menuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMenuOpen(false)}
        />

        {/* Drawer */}
        <div className={`absolute top-0 right-0 bottom-0 w-72 bg-white dark:bg-gray-900 shadow-2xl transition-transform duration-300 ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          {/* Drawer header */}
          <div className="flex items-center justify-between p-4 border-b border-mint-light/50 dark:border-gray-800 h-16">
            <span className="font-display font-bold text-primary-600 dark:text-sage-400">Menu</span>
            <button onClick={() => setMenuOpen(false)}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface dark:hover:bg-gray-800 text-gray-400 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Nav links */}
          <nav className="p-4 space-y-1">
            {NAV_LINKS.map(link => (
              <Link key={link.to} to={link.to}
                className={`flex items-center px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                  location.pathname === link.to
                    ? 'bg-mint-light dark:bg-primary-900/40 text-primary-600 font-semibold'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-surface dark:hover:bg-gray-800'
                }`}>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Auth buttons */}
          <div className="px-4 pt-4 border-t border-mint-light/50 dark:border-gray-800 space-y-3">
            {isAuthenticated ? (
              <Link to={dashboardLink}
                className="btn-primary w-full justify-center py-3 text-sm">
                {isAdmin ? 'Admin Panel' : 'My Dashboard'} →
              </Link>
            ) : (
              <>
                <Link to="/login"    className="btn-outline w-full justify-center py-3 text-sm">Log In</Link>
                <Link to="/register" className="btn-primary w-full justify-center py-3 text-sm">Get Started Free</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
