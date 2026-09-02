import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function DarkModeToggle({ className = '' }) {
  const { dark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-300 ${
        dark ? 'bg-primary-500' : 'bg-gray-200'
      } ${className}`}
      aria-label="Toggle dark mode"
    >
      {/* Track icons */}
      <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px]">🌙</span>
      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px]">☀️</span>

      {/* Thumb */}
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${
          dark ? 'translate-x-6' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
