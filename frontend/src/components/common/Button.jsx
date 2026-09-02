/**
 * Button.jsx
 * Reusable button with variants, sizes, loading state, icon support.
 *
 * Variants: primary | outline | ghost | danger | warm | secondary
 * Sizes:    sm | md | lg | xl
 */
import React from 'react';

const VARIANTS = {
  primary:   'bg-green-gradient text-white shadow-glow-green hover:shadow-card-hover hover:opacity-90 disabled:opacity-50',
  outline:   'border-2 border-primary-500 text-primary-600 bg-transparent hover:bg-primary-50 disabled:opacity-50',
  ghost:     'text-primary-600 bg-transparent hover:bg-mint-light disabled:opacity-40',
  danger:    'bg-red-500 text-white hover:bg-red-600 shadow-sm disabled:opacity-50',
  warm:      'bg-warm text-white shadow-glow-warm hover:opacity-90 disabled:opacity-50',
  secondary: 'bg-mint-light text-primary-700 hover:bg-mint-dark/30 disabled:opacity-50',
  white:     'bg-white text-primary-700 border border-mint-dark/20 hover:bg-surface shadow-soft disabled:opacity-50',
};

const SIZES = {
  sm:  'px-3 py-1.5 text-xs rounded-xl gap-1.5',
  md:  'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg:  'px-6 py-3   text-base rounded-2xl gap-2',
  xl:  'px-8 py-4   text-base rounded-2xl gap-2.5',
};

function Spinner({ size }) {
  const dim = size === 'sm' ? 'w-3 h-3' : size === 'lg' || size === 'xl' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <svg className={`${dim} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export default function Button({
  children,
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  type     = 'button',
  className = '',
  onClick,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center font-semibold
        transition-all duration-200 cursor-pointer select-none
        active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-1
        disabled:cursor-not-allowed disabled:active:scale-100
        ${VARIANTS[variant] || VARIANTS.primary}
        ${SIZES[size]       || SIZES.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <Spinner size={size} />
      ) : leftIcon ? (
        <span className="flex-shrink-0">{leftIcon}</span>
      ) : null}

      {children && <span>{children}</span>}

      {!loading && rightIcon && (
        <span className="flex-shrink-0">{rightIcon}</span>
      )}
    </button>
  );
}
