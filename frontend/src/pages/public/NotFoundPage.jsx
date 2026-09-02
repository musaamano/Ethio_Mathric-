import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function NotFoundPage() {
  const navigate      = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();

  const home = isAdmin ? '/admin' : isAuthenticated ? '/dashboard' : '/';

  return (
    <div className="min-h-screen bg-hero-gradient flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Orbs */}
      <div className="orb w-96 h-96 bg-sage-300/30 -top-32 -right-32" />
      <div className="orb w-64 h-64 bg-mint-dark/20 bottom-0 -left-16" />

      <div className="relative z-10 max-w-lg">
        {/* Big 404 */}
        <div className="relative mb-6">
          <p className="font-display font-extrabold text-[10rem] leading-none text-primary-200 select-none">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl animate-bounce-soft">🗺️</div>
          </div>
        </div>

        <h1 className="font-display font-extrabold text-3xl text-primary-700 mb-3">
          Page Not Found
        </h1>
        <p className="text-gray-500 text-base mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="btn-outline px-8 py-3 text-sm"
          >
            ← Go Back
          </button>
          <Link to={home} className="btn-primary px-8 py-3 text-sm">
            Go to {isAuthenticated ? 'Dashboard' : 'Home'}
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-10 flex flex-wrap gap-2 justify-center">
          {[
            { label: 'Home',       to: '/' },
            { label: 'Login',      to: '/login' },
            { label: 'Register',   to: '/register' },
            { label: 'FAQ',        to: '/faq' },
            { label: 'Contact',    to: '/contact' },
          ].map(l => (
            <Link key={l.to} to={l.to}
              className="px-3 py-1.5 text-xs font-medium bg-white/70 backdrop-blur-sm border border-mint-dark/20 text-gray-500 rounded-xl hover:text-primary-600 hover:border-primary-300 transition-all">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
