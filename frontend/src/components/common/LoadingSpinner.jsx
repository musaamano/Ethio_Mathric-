/**
 * LoadingSpinner.jsx
 * Three variants: spinner, dots, page-level full-screen overlay.
 *
 * Usage:
 *   <LoadingSpinner />                         — inline spinner
 *   <LoadingSpinner variant="dots" />          — animated dots
 *   <LoadingSpinner variant="page" />          — full-screen overlay
 *   <LoadingSpinner size="lg" text="Loading questions..." />
 */
import React from 'react';

const SIZES = {
  sm:  'w-4 h-4',
  md:  'w-6 h-6',
  lg:  'w-10 h-10',
  xl:  'w-16 h-16',
};

function SpinnerIcon({ size = 'md', color = 'text-primary-500' }) {
  return (
    <svg
      className={`animate-spin ${SIZES[size] || SIZES.md} ${color}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-80"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function DotsLoader({ color = 'bg-primary-500' }) {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${color} animate-bounce`}
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

export default function LoadingSpinner({
  variant  = 'spinner',    // 'spinner' | 'dots' | 'page'
  size     = 'md',
  text,
  color    = 'text-primary-500',
  dotColor = 'bg-primary-500',
  className = '',
}) {
  // ── Full-page overlay ────────────────────────────────────
  if (variant === 'page') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-sm">
        <div className="soft-card p-8 flex flex-col items-center gap-4">
          {/* Logo */}
          <div className="w-14 h-14 rounded-2xl bg-green-gradient flex items-center justify-center shadow-glow-green animate-pulse-green">
            <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <SpinnerIcon size="lg" color="text-primary-500" />
          <p className="text-sm font-medium text-gray-500">
            {text || 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // ── Inline skeleton-style card loader ───────────────────
  if (variant === 'skeleton') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-mint-light rounded-full w-3/4 mb-3" />
        <div className="h-4 bg-mint-light rounded-full w-1/2 mb-3" />
        <div className="h-4 bg-mint-light rounded-full w-5/6" />
      </div>
    );
  }

  // ── Dots ─────────────────────────────────────────────────
  if (variant === 'dots') {
    return (
      <div className={`flex flex-col items-center gap-3 ${className}`}>
        <DotsLoader color={dotColor} />
        {text && <p className="text-sm text-gray-500">{text}</p>}
      </div>
    );
  }

  // ── Default spinner ──────────────────────────────────────
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <SpinnerIcon size={size} color={color} />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  );
}
