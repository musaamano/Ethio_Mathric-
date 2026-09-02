import React from 'react';

export default function TimerBar({ formatted, percentLeft, isExpired }) {
  const color = percentLeft > 50 ? 'bg-green-gradient' : percentLeft > 20 ? 'bg-yellow-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-1.5 font-display font-bold text-lg min-w-[4.5rem] ${isExpired ? 'text-red-500' : percentLeft < 20 ? 'text-red-500 animate-pulse' : 'text-primary-700'}`}>
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        {formatted}
      </div>
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-1000`}
          style={{ width: `${percentLeft}%` }} />
      </div>
    </div>
  );
}
