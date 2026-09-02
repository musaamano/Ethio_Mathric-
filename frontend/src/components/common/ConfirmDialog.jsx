/**
 * ConfirmDialog.jsx
 * Reusable confirmation modal for destructive actions.
 *
 * Usage:
 *   <ConfirmDialog
 *     isOpen={showConfirm}
 *     onClose={() => setShowConfirm(false)}
 *     onConfirm={handleDelete}
 *     title="Delete Question"
 *     message="This action cannot be undone. The question will be permanently removed."
 *     confirmLabel="Delete"
 *     variant="danger"
 *     loading={isDeleting}
 *   />
 */
import React from 'react';
import Button from './Button';

const ICONS = {
  danger: (
    <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  warning: (
    <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  info: (
    <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const ICON_BG = {
  danger:  'bg-red-50',
  warning: 'bg-yellow-50',
  info:    'bg-primary-50',
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title         = 'Are you sure?',
  message       = 'This action cannot be undone.',
  confirmLabel  = 'Confirm',
  cancelLabel   = 'Cancel',
  variant       = 'danger',   // 'danger' | 'warning' | 'info'
  loading       = false,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-card-hover animate-scale-in">
        {/* Body */}
        <div className="p-6 text-center">
          {/* Icon */}
          <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl ${ICON_BG[variant]} flex items-center justify-center`}>
            {ICONS[variant]}
          </div>

          <h3 className="font-display font-bold text-lg text-gray-800 mb-2">{title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <Button
            variant="white"
            fullWidth
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : variant === 'warning' ? 'warm' : 'primary'}
            fullWidth
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
