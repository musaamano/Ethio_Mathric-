import React from 'react';
import { formatScore } from '../../utils/helpers';

export default function SubjectProgressBar({ name, score, attempts, color = '#52B788' }) {
  const f = formatScore(score);
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-sm font-semibold text-gray-700 truncate flex-shrink-0">{name}</div>
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(score || 0, 100)}%`, backgroundColor: color }}
        />
      </div>
      <div className={`text-xs font-bold w-12 text-right ${f.color}`}>{f.text}</div>
      {attempts !== undefined && (
        <div className="text-xs text-gray-400 w-16 text-right flex-shrink-0">{attempts} tries</div>
      )}
    </div>
  );
}
