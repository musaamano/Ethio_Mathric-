import React, { useState } from 'react';

const TYPE_STYLES = {
  info:    { bg: 'bg-primary-50 border-primary-200',  icon: 'ℹ️', text: 'text-primary-700' },
  success: { bg: 'bg-mint-light border-sage-200',     icon: '✅', text: 'text-sage-700'    },
  warning: { bg: 'bg-yellow-50 border-yellow-200',    icon: '⚠️', text: 'text-yellow-700'  },
  error:   { bg: 'bg-red-50 border-red-200',          icon: '❌', text: 'text-red-700'     },
};

export default function AnnouncementBanner({ announcements = [] }) {
  const [dismissed, setDismissed] = useState([]);
  const visible = announcements.filter(a => !dismissed.includes(a.id));
  if (!visible.length) return null;

  return (
    <div className="space-y-2 mb-4">
      {visible.slice(0, 3).map(a => {
        const s = TYPE_STYLES[a.type] || TYPE_STYLES.info;
        return (
          <div key={a.id} className={`flex items-start gap-3 p-4 rounded-2xl border ${s.bg}`}>
            <span className="text-lg flex-shrink-0">{s.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${s.text}`}>{a.title}</p>
              <p className={`text-xs mt-0.5 ${s.text} opacity-80`}>{a.content}</p>
            </div>
            <button onClick={() => setDismissed(d => [...d, a.id])}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
