import React, { useState } from 'react';
import questionService from '../../services/questionService';
import { useToast } from '../common/Toast';

export default function BookmarkButton({ questionId, initialBookmarked = false }) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading,    setLoading]    = useState(false);
  const toast = useToast();

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await questionService.toggleBookmark(questionId);
      setBookmarked(res.bookmarked);
      toast.success(res.bookmarked ? 'Question bookmarked' : 'Bookmark removed');
    } catch {
      toast.error('Failed to update bookmark');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={bookmarked ? 'Remove bookmark' : 'Bookmark this question'}
      className={`p-2.5 rounded-xl transition-all duration-200 ${
        bookmarked
          ? 'bg-warm-light text-warm-dark hover:bg-warm/20'
          : 'bg-gray-100 text-gray-400 hover:bg-mint-light hover:text-primary-600'
      }`}
    >
      <svg className="w-5 h-5" fill={bookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
      </svg>
    </button>
  );
}
