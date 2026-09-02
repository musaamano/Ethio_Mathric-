/**
 * SearchBar.jsx
 * Debounced search input with clear button, loading state, filter slot.
 *
 * Usage:
 *   <SearchBar
 *     value={search}
 *     onChange={setSearch}
 *     placeholder="Search questions..."
 *     loading={isLoading}
 *   />
 */
import React, { useRef } from 'react';

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  loading     = false,
  onClear,
  className   = '',
  size        = 'md',     // 'sm' | 'md' | 'lg'
  autoFocus   = false,
  rightSlot,              // e.g. a filter dropdown
}) {
  const inputRef = useRef(null);

  const sizeClass = size === 'sm'
    ? 'h-9 text-xs px-3 pl-9'
    : size === 'lg'
    ? 'h-12 text-base px-4 pl-12'
    : 'h-10 text-sm px-4 pl-10';

  const iconSize = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  const iconLeft = size === 'lg' ? 'left-4' : 'left-3';

  const handleClear = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex-1">
        {/* Search icon */}
        <div className={`absolute ${iconLeft} top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none`}>
          {loading ? (
            <svg className={`${iconSize} animate-spin`} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`
            w-full ${sizeClass}
            bg-white border border-mint-dark/30 rounded-2xl
            text-gray-800 placeholder:text-gray-400
            focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100
            transition-all duration-200
            ${value ? 'pr-9' : 'pr-4'}
          `}
        />

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Right slot (e.g. filter button) */}
      {rightSlot && <div className="flex-shrink-0">{rightSlot}</div>}
    </div>
  );
}
