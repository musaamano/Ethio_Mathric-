import React, { useEffect, useState } from 'react';
import analyticsService from '../../services/analyticsService';
import { useToast }     from '../../components/common/Toast';
import LoadingSpinner   from '../../components/common/LoadingSpinner';
import EmptyState       from '../../components/common/EmptyState';
import Pagination       from '../../components/common/Pagination';
import { formatScore, formatDate, formatDuration, snakeToTitle } from '../../utils/helpers';

const MODE_LABELS = {
  practice: { icon: '⚡', label: 'Practice'   },
  past_year:{ icon: '📅', label: 'Past-Year'  },
  random:   { icon: '🎲', label: 'Random'     },
};

export default function HistoryPage() {
  const toast = useToast();
  const [results,    setResults]    = useState([]);
  const [pagination, setPagination] = useState({});
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    setLoading(true);
    analyticsService.getHistory({ page, limit: 15 })
      .then(res => { setResults(res.data); setPagination(res.pagination); })
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-extrabold text-2xl text-primary-700">History 📋</h2>
        <p className="text-sm text-gray-500 mt-0.5">All your past practice sessions.</p>
      </div>

      {loading ? (
        <LoadingSpinner variant="dots" className="py-16" />
      ) : results.length === 0 ? (
        <EmptyState preset="results" action={{ label: 'Start Practicing', href: '/dashboard/practice' }} />
      ) : (
        <>
          <div className="soft-card overflow-hidden">
            <div className="hidden sm:grid grid-cols-6 gap-4 px-5 py-3 bg-surface border-b border-mint-light/60 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <div className="col-span-2">Session</div>
              <div>Mode</div>
              <div className="text-center">Score</div>
              <div className="text-center">Questions</div>
              <div className="text-right">Date</div>
            </div>
            <div className="divide-y divide-mint-light/40">
              {results.map(r => {
                const score = formatScore(r.score_percent);
                const mode  = MODE_LABELS[r.mode] || { icon: '📊', label: snakeToTitle(r.mode || 'practice') };
                return (
                  <div key={r.id} className="grid grid-cols-1 sm:grid-cols-6 gap-2 sm:gap-4 px-5 py-4 hover:bg-surface transition-colors items-center">
                    <div className="sm:col-span-2">
                      <p className="text-sm font-semibold text-primary-700">
                        {r.subject_name || 'Practice Session'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{mode.icon}</span>
                      <span className="text-xs font-medium text-gray-500">{mode.label}</span>
                    </div>
                    <div className="text-center">
                      <span className={`font-display font-bold text-base ${score.color}`}>{score.text}</span>
                    </div>
                    <div className="text-center text-sm text-gray-500">
                      <span className="text-sage-600 font-semibold">{r.correct_answers}</span>
                      <span className="text-gray-300 mx-1">/</span>
                      {r.total_questions}
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-400">{formatDate(r.completed_at, 'short')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <Pagination currentPage={page} totalPages={pagination.totalPages}
            onPageChange={setPage} totalItems={pagination.total} itemsPerPage={15} />
        </>
      )}
    </div>
  );
}
