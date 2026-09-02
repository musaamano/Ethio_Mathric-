import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import questionService from '../../services/questionService';
import { useToast } from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import Badge from '../../components/common/Badge';
import OptionButton from '../../components/questions/OptionButton';

export default function BookmarksPage() {
  const toast = useToast();
  const [bookmarks, setBookmarks] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = (p = 1) => {
    setLoading(true);
    questionService.getBookmarks({ page: p, limit: 10 })
      .then(res => { setBookmarks(res.data); setPagination(res.pagination); })
      .catch(() => toast.error('Failed to load bookmarks'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [page]);

  const removeBookmark = async (questionId) => {
    try {
      await questionService.toggleBookmark(questionId);
      toast.success('Bookmark removed');
      load(page);
    } catch { toast.error('Failed to remove bookmark'); }
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-primary-700">Bookmarks 🔖</h2>
          <p className="text-sm text-gray-500 mt-0.5">Your saved difficult questions.</p>
        </div>
        <span className="badge bg-mint-light text-primary-600 border border-sage-200">
          {pagination.total || 0} saved
        </span>
      </div>

      {loading ? (
        <LoadingSpinner variant="dots" className="py-16" />
      ) : bookmarks.length === 0 ? (
        <EmptyState preset="bookmarks" action={{ label: 'Start Practicing', onClick: () => {} }} />
      ) : (
        <>
          <div className="space-y-3">
            {bookmarks.map(q => (
              <div key={q.bookmark_id} className="soft-card overflow-hidden">
                <button onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-surface transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-xs text-gray-400 font-medium">{q.subject_name}</span>
                      {q.difficulty && <Badge preset="difficulty" value={q.difficulty} />}
                    </div>
                    <p className="text-sm text-gray-700 leading-snug">{q.question_text}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={e => { e.stopPropagation(); removeBookmark(q.id); }}
                      className="p-1.5 rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded === q.id ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                    </svg>
                  </div>
                </button>
                {expanded === q.id && (
                  <div className="px-4 pb-4 space-y-2 border-t border-mint-light/60 pt-3">
                    {(q.options || []).map(opt => (
                      <OptionButton key={opt.option_label} label={opt.option_label}
                        text={opt.option_text}
                        state={opt.is_correct ? 'reveal' : 'idle'}
                        disabled />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <Pagination currentPage={page} totalPages={pagination.totalPages}
            onPageChange={setPage} totalItems={pagination.total} itemsPerPage={10} />
        </>
      )}
    </div>
  );
}
