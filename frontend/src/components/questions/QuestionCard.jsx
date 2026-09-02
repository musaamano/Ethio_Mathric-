import React from 'react';
import Badge from '../common/Badge';
import { formatDifficulty } from '../../utils/helpers';

export default function QuestionCard({ question, number, total, children }) {
  if (!question) return null;
  const diff = formatDifficulty(question.difficulty);

  return (
    <div className="soft-card p-6">
      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {total && (
          <span className="text-xs font-semibold text-gray-400">
            Question <span className="text-primary-600">{number}</span> / {total}
          </span>
        )}
        {question.difficulty && <Badge preset="difficulty" value={question.difficulty} />}
        {question.exam_importance === 'very_high' && (
          <span className="text-xs font-semibold text-warm-dark bg-warm-light px-2 py-0.5 rounded-lg">
            🔥 High Exam Importance
          </span>
        )}
      </div>

      {/* Question text */}
      <p className="text-base sm:text-lg font-medium text-gray-800 leading-relaxed mb-4">
        {question.question_text}
      </p>

      {/* Image */}
      {question.image_url && (
        <div className="mb-4 rounded-2xl overflow-hidden border border-mint-dark/20">
          <img
            src={question.image_url}
            alt="Question diagram"
            className="max-h-64 w-full object-contain bg-gray-50"
          />
        </div>
      )}

      {children}
    </div>
  );
}
