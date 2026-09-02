/**
 * Badge.jsx
 * Coloured status/label badges used across the app.
 *
 * Usage:
 *   <Badge color="green">Active</Badge>
 *   <Badge color="red" dot>Expired</Badge>
 *   <Badge preset="difficulty" value="hard" />
 *   <Badge preset="score" value={86} />
 *   <Badge preset="role" value="admin" />
 *   <Badge preset="payment" value="completed" />
 *   <Badge preset="subscription" value="active" />
 */
import React from 'react';
import { formatScore, formatDifficulty } from '../../utils/helpers';

const COLORS = {
  green:  'bg-mint-light  text-sage-700   border-sage-200',
  blue:   'bg-primary-50  text-primary-700 border-primary-100',
  yellow: 'bg-yellow-50   text-yellow-700  border-yellow-200',
  red:    'bg-red-50      text-red-700     border-red-200',
  orange: 'bg-orange-50   text-orange-700  border-orange-200',
  purple: 'bg-purple-50   text-purple-700  border-purple-200',
  gray:   'bg-gray-100    text-gray-600    border-gray-200',
  warm:   'bg-warm-light  text-warm-dark   border-warm/30',
  teal:   'bg-teal-50     text-teal-700    border-teal-200',
};

const DOT_COLORS = {
  green: 'bg-sage-400', blue: 'bg-primary-400', yellow: 'bg-yellow-400',
  red: 'bg-red-400', orange: 'bg-orange-400', purple: 'bg-purple-400',
  gray: 'bg-gray-400', warm: 'bg-warm', teal: 'bg-teal-400',
};

// ── Preset maps ───────────────────────────────────────────
const ROLE_MAP = {
  student:     { color: 'blue',   label: 'Student' },
  admin:       { color: 'purple', label: 'Admin' },
  super_admin: { color: 'orange', label: 'Super Admin' },
};

const PAYMENT_MAP = {
  pending:   { color: 'yellow', label: 'Pending' },
  completed: { color: 'green',  label: 'Completed' },
  failed:    { color: 'red',    label: 'Failed' },
  refunded:  { color: 'gray',   label: 'Refunded' },
};

const SUBSCRIPTION_MAP = {
  active:    { color: 'green',  label: 'Active' },
  pending:   { color: 'yellow', label: 'Pending' },
  expired:   { color: 'red',    label: 'Expired' },
  cancelled: { color: 'gray',   label: 'Cancelled' },
};

const QUESTION_TYPE_MAP = {
  multiple_choice: { color: 'blue',   label: 'MCQ' },
  true_false:      { color: 'teal',   label: 'True/False' },
  fill_blank:      { color: 'purple', label: 'Fill Blank' },
  image_based:     { color: 'orange', label: 'Image' },
  matching:        { color: 'warm',   label: 'Matching' },
};

export default function Badge({
  children,
  color     = 'blue',
  dot       = false,
  size      = 'sm',  // 'xs' | 'sm' | 'md'
  preset,            // 'difficulty' | 'score' | 'role' | 'payment' | 'subscription' | 'qtype'
  value,
  className = '',
}) {
  let resolvedColor = color;
  let resolvedLabel = children;

  // Handle presets
  if (preset === 'difficulty') {
    const f = formatDifficulty(value);
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border ${f.bg} ${f.color} border-current/20 ${className}`}>
        {f.label}
      </span>
    );
  }

  if (preset === 'score') {
    const f = formatScore(value);
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold border ${f.bg} ${f.color} border-current/20 ${className}`}>
        {f.text}
      </span>
    );
  }

  if (preset === 'role') {
    const m = ROLE_MAP[value] || { color: 'gray', label: value };
    resolvedColor = m.color;
    resolvedLabel = m.label;
  }

  if (preset === 'payment') {
    const m = PAYMENT_MAP[value] || { color: 'gray', label: value };
    resolvedColor = m.color;
    resolvedLabel = m.label;
  }

  if (preset === 'subscription') {
    const m = SUBSCRIPTION_MAP[value] || { color: 'gray', label: value };
    resolvedColor = m.color;
    resolvedLabel = m.label;
  }

  if (preset === 'qtype') {
    const m = QUESTION_TYPE_MAP[value] || { color: 'gray', label: value };
    resolvedColor = m.color;
    resolvedLabel = m.label;
  }

  const sizeClass = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]'
    : size === 'md' ? 'px-3 py-1 text-sm'
    : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-semibold rounded-lg border
        ${sizeClass}
        ${COLORS[resolvedColor] || COLORS.blue}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[resolvedColor] || 'bg-blue-400'}`} />
      )}
      {resolvedLabel}
    </span>
  );
}
