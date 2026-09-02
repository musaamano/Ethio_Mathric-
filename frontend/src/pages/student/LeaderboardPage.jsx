import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import analyticsService from '../../services/analyticsService';
import LeaderboardRow from '../../components/dashboard/LeaderboardRow';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

const PERIODS = [
  { id: 'daily',   label: 'Today' },
  { id: 'weekly',  label: 'This Week' },
  { id: 'monthly', label: 'This Month' },
  { id: 'all',     label: 'All Time' },
];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [period, setPeriod]     = useState('weekly');
  const [entries, setEntries]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    analyticsService.getLeaderboard({ period, limit: 50 })
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [period]);

  const myEntry = entries.find(e => e.id === user?.id);

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h2 className="font-display font-extrabold text-2xl text-primary-700">Leaderboard 🏆</h2>
        <p className="text-sm text-gray-500 mt-0.5">See how you rank against students nationwide.</p>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-soft border border-mint-light/60">
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              period === p.id ? 'bg-green-gradient text-white shadow-glow-green' : 'text-gray-500 hover:bg-mint-light'
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Your rank banner */}
      {myEntry && (
        <div className="soft-card p-4 border-2 border-sage-300 bg-mint-light/40">
          <p className="text-xs text-sage-600 font-bold mb-2">YOUR RANKING</p>
          <LeaderboardRow entry={myEntry} isCurrentUser />
        </div>
      )}

      {/* List */}
      {loading ? (
        <LoadingSpinner variant="dots" className="py-12" />
      ) : entries.length === 0 ? (
        <EmptyState icon="🏆" title="No rankings yet" message="Complete practice sessions or mock exams to appear on the leaderboard." />
      ) : (
        <div className="soft-card divide-y divide-mint-light/40">
          {entries.map(entry => (
            <LeaderboardRow key={entry.id} entry={entry} isCurrentUser={entry.id === user?.id} />
          ))}
        </div>
      )}
    </div>
  );
}
