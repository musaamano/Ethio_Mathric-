/**
 * Input.jsx
 * Reusable form input with label, error, helper text, icons, password toggle.
 * Integrates seamlessly with React Hook Form via `register` prop.
 */
import React, { useState, forwardRef } from 'react';

const Input = forwardRef(function Input(
  {
    label,
    name,
    type        = 'text',
    placeholder = '',
    error,
    helperText,
    leftIcon,
    rightIcon,
    disabled    = false,
    required    = false,
    className   = '',
    inputClassName = '',
    ...props
  },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword  = type === 'password';
  const inputType   = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Label */}
      {label && (
        <label htmlFor={name} className="text-sm font-semibold text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input wrapper */}
      <div className="relative flex items-center">
        {/* Left icon */}
        {leftIcon && (
          <div className="absolute left-3.5 text-gray-400 pointer-events-none z-10">
            {leftIcon}
          </div>
        )}

        <input
          id={name}
          name={name}
          type={inputType}
          placeholder={placeholder}
          disabled={disabled}
          ref={ref}
          className={`
            w-full px-4 py-3 rounded-2xl
            bg-white border transition-all duration-200
            text-gray-800 placeholder:text-gray-400 text-sm
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
            ${leftIcon  ? 'pl-10'  : ''}
            ${rightIcon || isPassword ? 'pr-11' : ''}
            ${error
              ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
              : 'border-mint-dark/30 focus:border-primary-400 focus:ring-primary-100'
            }
            ${inputClassName}
          `}
          {...props}
        />

        {/* Right icon or password toggle */}
        <div className="absolute right-3.5 flex items-center">
          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="text-gray-400 hover:text-primary-500 transition-colors p-0.5"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          ) : rightIcon ? (
            <span className="text-gray-400">{rightIcon}</span>
          ) : null}
        </div>
      </div>

      {/* Error or helper text */}
      {error ? (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-gray-400">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Input;
