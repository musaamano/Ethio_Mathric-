import React from 'react';
import { formatScore, ordinal, initials, fullName } from '../../utils/helpers';

export default function LeaderboardRow({ entry, isCurrentUser }) {
  const rank = entry.rank_pos;
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
  const f = formatScore(entry.avg_score);

  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
      isCurrentUser ? 'bg-mint-light border border-sage-300 shadow-soft' : 'hover:bg-surface'
    }`}>
      {/* Rank */}
      <div className="w-8 text-center flex-shrink-0">
        {medal ? (
          <span className="text-xl">{medal}</span>
        ) : (
          <span className="text-sm font-bold text-gray-400">{rank}</span>
        )}
      </div>

      {/* Avatar */}
      {entry.avatar_url ? (
        <img src={entry.avatar_url} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-xl bg-green-gradient flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {initials(entry.full_name)}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isCurrentUser ? 'text-primary-700' : 'text-gray-700'}`}>
          {entry.full_name} {isCurrentUser && <span className="text-xs text-sage-500">(You)</span>}
        </p>
        <p className="text-xs text-gray-400">{entry.school || entry.stream?.replace('_',' ') || 'Ethiopia'}</p>
      </div>

      {/* Score */}
      <div className="text-right flex-shrink-0">
        <div className={`text-sm font-bold ${f.color}`}>{f.text}</div>
        <div className="text-[10px] text-gray-400">{entry.exams_taken} exams</div>
      </div>
    </div>
  );
}
