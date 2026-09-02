import React from 'react';

export default function StreakCalendar({ streak = 0, completedDates = [] }) {
  // Normalise: parent may pass null/undefined explicitly (e.g. while data loads)
  const safeDates = Array.isArray(completedDates) ? completedDates : [];
  const today = new Date();
  const days  = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🔥</span>
        <div>
          <p className="font-display font-extrabold text-2xl text-warm-dark leading-tight">{streak}</p>
          <p className="text-xs text-gray-400">day streak</p>
        </div>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {days.map(d => {
          const isToday    = d === today.toISOString().split('T')[0];
          const isComplete = safeDates.includes(d);
          return (
            <div
              key={d}
              title={d}
              className={`w-5 h-5 rounded-md transition-all ${
                isComplete ? 'bg-green-gradient shadow-glow-green' :
                isToday    ? 'bg-mint-dark/40 ring-2 ring-sage-400' :
                             'bg-gray-100'
              }`}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-gray-400">30 days ago</span>
        <span className="text-[10px] text-gray-400">Today</span>
      </div>
    </div>
  );
}
