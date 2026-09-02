/**
 * SubjectsPage.jsx — Phase 2
 * Subject picker for the Practice workflow.
 * - Auto-uses the student's registered stream (no toggle).
 * - Each subject links directly to the practice session (no chapter selection).
 * - Rendered at /dashboard/subjects (kept for backward compatibility)
 *   but the primary entry point is /dashboard/practice (see PracticePage).
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import subjectService from '../../services/subjectService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { useToast } from '../../components/common/Toast';
import { snakeToTitle } from '../../utils/helpers';

// Subject colour dot / icon background
const SUBJECT_ICONS = {
  'math-natural':    '📐',
  'math-social':     '📐',
  'physics':         '⚛️',
  'chemistry':       '🧪',
  'biology':         '🧬',
  'english-natural': '📖',
  'english-social':  '📖',
  'ict':             '💻',
  'economics':       '📊',
  'history':         '🏛️',
  'geography':       '🌍',
  'citizenship':     '⚖️',
};

function SubjectCard({ subject, onSelect }) {
  const icon  = SUBJECT_ICONS[subject.slug] || '📘';
  const color = subject.color || '#52B788';

  return (
    <button
      onClick={() => onSelect(subject)}
      className="
        w-full text-left soft-card p-5 group
        hover:shadow-card-hover hover:-translate-y-1
        transition-all duration-200 focus:outline-none
        focus-visible:ring-2 focus-visible:ring-primary-400
      "
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-soft group-hover:scale-110 transition-transform"
          style={{ backgroundColor: color + '20' }}
        >
          {icon}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-primary-700 truncate">{subject.name}</h3>
          {subject.description && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {subject.description.slice(0, 55)}
            </p>
          )}
        </div>

        {/* Arrow */}
        <svg
          className="w-4 h-4 text-gray-300 group-hover:text-primary-400 group-hover:translate-x-1 transition-all flex-shrink-0"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
        </svg>
      </div>

      {/* Start Practice label */}
      <div className="mt-3 flex items-center gap-1.5">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs font-semibold text-gray-400 group-hover:text-primary-500 transition-colors">
          Tap to start practice
        </span>
      </div>
    </button>
  );
}

export default function SubjectPicker() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const toast     = useToast();

  const [subjects, setSubjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [streamName, setStreamName] = useState('');

  useEffect(() => {
    subjectService.getStreams()
      .then(streams => {
        // Find the stream that matches the student's registered stream
        const userStream = user?.stream; // e.g. 'natural_science' or 'social_science'

        let matched = null;
        if (userStream) {
          matched = streams.find(s => {
            const slug = s.slug?.replace(/-/g, '_');  // 'natural-science' → 'natural_science'
            const name = s.name?.toLowerCase().replace(/\s+/g, '_');
            return slug === userStream || name === userStream;
          });
        }
        // Fallback to first stream if no match
        const stream = matched || streams[0];
        if (stream) {
          setSubjects(stream.subjects || []);
          setStreamName(stream.name || snakeToTitle(userStream || ''));
        }
      })
      .catch(() => toast.error('Failed to load subjects'))
      .finally(() => setLoading(false));
  }, [user?.stream]);

  const handleSelect = (subject) => {
    // Navigate directly to the practice session — no chapter/topic selection
    navigate(`/dashboard/practice?subject_id=${subject.id}&mode=practice&count=20`);
  };

  if (loading) return <LoadingSpinner variant="dots" text="Loading subjects..." className="py-20" />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h2 className="font-display font-extrabold text-2xl text-primary-700">Practice</h2>
        <p className="text-gray-500 text-sm mt-1">
          Choose a subject to start practicing.
        </p>
        {/* Stream indicator — read-only */}
        {streamName && (
          <div className="inline-flex items-center gap-2 mt-3 bg-primary-50 border border-primary-100 rounded-xl px-3 py-1.5">
            <span className="text-sm">{user?.stream === 'natural_science' ? '🔬' : '📰'}</span>
            <span className="text-xs font-semibold text-primary-600">{streamName}</span>
          </div>
        )}
      </div>

      {/* Subject grid */}
      {subjects.length === 0 ? (
        <EmptyState preset="empty" message="No subjects found for your stream." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {subjects.map(s => (
            <SubjectCard key={s.id} subject={s} onSelect={handleSelect} />
          ))}
        </div>
      )}

    </div>
  );
}
