/**
 * EmptyState.jsx
 * Friendly empty state with icon, title, message and optional CTA.
 *
 * Usage:
 *   <EmptyState
 *     icon="📚"
 *     title="No questions yet"
 *     message="Start by adding your first question."
 *     action={{ label: 'Add Question', onClick: handleAdd }}
 *   />
 */
import React from 'react';
import Button from './Button';

const PRESETS = {
  questions:  { icon: '📚', title: 'No questions found',    message: 'Try adjusting your search or filters.' },
  bookmarks:  { icon: '🔖', title: 'No bookmarks yet',      message: 'Save difficult questions to review them later.' },
  results:    { icon: '📊', title: 'No results yet',        message: 'Complete a practice session or mock exam to see your results here.' },
  users:      { icon: '👥', title: 'No users found',        message: 'Try a different search term.' },
  payments:   { icon: '💳', title: 'No payments found',     message: 'No payment records match your current filter.' },
  exams:      { icon: '📝', title: 'No exams available',    message: 'Check back soon — new mock exams are added regularly.' },
  search:     { icon: '🔍', title: 'No results',            message: 'Nothing matched your search. Try different keywords.' },
  network:    { icon: '🌐', title: 'Connection error',      message: 'Check your internet connection and try again.' },
  empty:      { icon: '📭', title: 'Nothing here yet',      message: 'This section is empty.' },
};

export default function EmptyState({
  preset,                 // shortcut: one of PRESETS keys
  icon,
  title,
  message,
  action,                 // { label, onClick, href, variant }
  secondaryAction,
  className = '',
  size = 'md',            // 'sm' | 'md' | 'lg'
}) {
  const p          = preset ? PRESETS[preset] || PRESETS.empty : {};
  const finalIcon  = icon  || p.icon  || '📭';
  const finalTitle = title || p.title || 'Nothing here';
  const finalMsg   = message || p.message || '';

  const iconSize = size === 'sm'
    ? 'w-12 h-12 text-3xl'
    : size === 'lg'
    ? 'w-24 h-24 text-5xl'
    : 'w-16 h-16 text-4xl';

  const titleSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';
  const msgSize   = size === 'sm' ? 'text-xs'   : 'text-sm';

  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
      {/* Icon bubble */}
      <div className={`${iconSize} bg-mint-light rounded-3xl flex items-center justify-center mb-5 shadow-soft`}>
        {finalIcon}
      </div>

      <h3 className={`font-display font-bold text-primary-700 mb-2 ${titleSize}`}>{finalTitle}</h3>

      {finalMsg && (
        <p className={`text-gray-500 max-w-xs leading-relaxed mb-6 ${msgSize}`}>{finalMsg}</p>
      )}

      {/* Action buttons */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button
              variant={action.variant || 'primary'}
              size="md"
              onClick={action.onClick}
              {...(action.href ? { as: 'a', href: action.href } : {})}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              size="md"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
