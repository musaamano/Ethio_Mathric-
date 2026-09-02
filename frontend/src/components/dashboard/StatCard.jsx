import React from 'react';

export default function StatCard({ icon, label, value, sub, color = 'green', trend }) {
  const colors = {
    green:  { bg: 'bg-mint-light',   icon: 'bg-green-gradient',  text: 'text-primary-600' },
    blue:   { bg: 'bg-primary-50',   icon: 'bg-primary-500',     text: 'text-primary-600' },
    warm:   { bg: 'bg-warm-light',   icon: 'bg-warm',            text: 'text-warm-dark'   },
    purple: { bg: 'bg-purple-50',    icon: 'bg-purple-500',      text: 'text-purple-600'  },
  };
  const c = colors[color] || colors.green;

  return (
    <div className={`soft-card p-5 flex items-center gap-4 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300`}>
      <div className={`w-12 h-12 rounded-2xl ${c.icon} flex items-center justify-center text-2xl shadow-soft flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
        <p className={`font-display font-extrabold text-2xl ${c.text} leading-tight`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`text-xs font-bold px-2 py-1 rounded-xl ${trend >= 0 ? 'bg-mint-light text-sage-600' : 'bg-red-50 text-red-500'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}
