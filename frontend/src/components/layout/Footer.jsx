import React from 'react';
import { Link } from 'react-router-dom';

const LINKS = {
  Platform: [
    { label: 'Features',    to: '/features' },
    { label: 'Subjects',    to: '/subjects' },
    { label: 'Mock Exams',  to: '/exams' },
    { label: 'Pricing',     to: '/pricing' },
    { label: 'Leaderboard', to: '/leaderboard' },
  ],
  Company: [
    { label: 'About Us',    to: '/about' },
    { label: 'Blog',        to: '/blog' },
    { label: 'Careers',     to: '/careers' },
    { label: 'Contact',     to: '/contact' },
    { label: 'Press Kit',   to: '/press' },
  ],
  Support: [
    { label: 'Help Center', to: '/faq' },
    { label: 'Privacy',     to: '/privacy' },
    { label: 'Terms',       to: '/terms' },
    { label: 'Cookies',     to: '/cookies' },
  ],
};

const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'History', 'Geography', 'English'];

export default function Footer() {
  return (
    <footer className="bg-primary-600 text-white relative overflow-hidden">
      {/* Decorative top wave */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sage-400 via-warm to-sage-400 opacity-60" />

      {/* Orbs */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-sage-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 left-0 w-72 h-72 bg-primary-400/20 rounded-full blur-3xl pointer-events-none" />

      <div className="section-container relative z-10 pt-16 pb-8">

        {/* Top section */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">

          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <div className="font-display font-bold text-white text-lg leading-tight">Ethio Matric Academy</div>
                <div className="text-xs text-mint-light/80 tracking-wide">Master the Matric Exam</div>
              </div>
            </Link>
            <p className="text-white/70 text-sm leading-relaxed max-w-xs mb-6">
              Ethiopia's #1 preparation platform for Grade 12 National Matric Examination. 
              Trusted by thousands of students across the country.
            </p>

            {/* Subjects quick links */}
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map(s => (
                <span key={s} className="px-2.5 py-1 text-xs font-medium bg-white/10 text-white/80 rounded-lg border border-white/10 hover:bg-white/20 cursor-pointer transition-all">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([group, links]) => (
            <div key={group}>
              <h4 className="font-display font-semibold text-white mb-4 text-sm uppercase tracking-wider">{group}</h4>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-white/65 hover:text-white text-sm transition-colors duration-200">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
          <p className="text-white/50 text-sm">
            © {new Date().getFullYear()} Ethio Matric Academy. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-white/50 text-sm">
            <span>Made with</span>
            <svg className="w-4 h-4 text-warm fill-current" viewBox="0 0 24 24">
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
            </svg>
            <span>for Ethiopian students</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
