/**
 * Toast.jsx
 * Lightweight toast notification system — no external library needed.
 * Uses a context + portal to render toasts at the top of the screen.
 *
 * Usage:
 *   // Wrap app in <ToastProvider>
 *   const { showToast } = useToast();
 *   showToast('Saved successfully!', 'success');
 *   showToast('Something went wrong', 'error');
 *   showToast('Please check your input', 'warning');
 *   showToast('New question added', 'info');
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

// ── Context ───────────────────────────────────────────────
const ToastContext = createContext(null);

const ICONS = {
  success: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const STYLES = {
  success: 'bg-mint-light border-sage-300 text-sage-700',
  error:   'bg-red-50 border-red-300 text-red-700',
  warning: 'bg-yellow-50 border-yellow-300 text-yellow-700',
  info:    'bg-primary-50 border-primary-200 text-primary-700',
};

const ICON_BG = {
  success: 'bg-sage-400',
  error:   'bg-red-400',
  warning: 'bg-yellow-400',
  info:    'bg-primary-400',
};

// ── Single Toast item ─────────────────────────────────────
function ToastItem({ toast, onRemove }) {
  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-2xl border shadow-card
        backdrop-blur-sm min-w-[280px] max-w-sm
        animate-slide-right
        ${STYLES[toast.type] || STYLES.info}
      `}
      role="alert"
    >
      {/* Icon circle */}
      <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${ICON_BG[toast.type]}`}>
        {ICONS[toast.type]}
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-semibold text-sm mb-0.5">{toast.title}</p>
        )}
        <p className="text-sm leading-snug">{toast.message}</p>
      </div>

      {/* Close */}
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity mt-0.5"
        aria-label="Dismiss"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', options = {}) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast = { id, message, type, title: options.title, duration: options.duration ?? 4000 };

    setToasts(prev => [...prev, toast]);

    // Auto-dismiss
    if (toast.duration > 0) {
      setTimeout(() => removeToast(id), toast.duration);
    }
  }, [removeToast]);

  // Convenience shortcuts
  const toast = {
    success: (msg, opts) => showToast(msg, 'success', opts),
    error:   (msg, opts) => showToast(msg, 'error',   opts),
    warning: (msg, opts) => showToast(msg, 'warning', opts),
    info:    (msg, opts) => showToast(msg, 'info',    opts),
    show:    showToast,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container — top-right */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none"
      >
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside <ToastProvider>');
  return ctx;
}

export default ToastProvider;
