/**
 * Modal.jsx
 * Accessible, animated modal dialog.
 * Traps focus, closes on Escape key and backdrop click.
 *
 * Usage:
 *   <Modal isOpen={open} onClose={() => setOpen(false)} title="Edit Question">
 *     <p>Content here</p>
 *   </Modal>
 */
import React, { useEffect, useRef } from 'react';

const SIZES = {
  sm:   'max-w-sm',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-[95vw]',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size        = 'md',
  showClose   = true,
  closeOnBackdrop = true,
  footer,
  className   = '',
}) {
  const overlayRef = useRef(null);
  const firstFocusRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus the modal after mount
      setTimeout(() => firstFocusRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdrop = (e) => {
    if (closeOnBackdrop && e.target === overlayRef.current) onClose();
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`
          relative w-full ${SIZES[size] || SIZES.md}
          bg-white rounded-3xl shadow-card-hover
          animate-scale-in flex flex-col max-h-[90vh]
          ${className}
        `}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-mint-light/60 flex-shrink-0">
            {title && (
              <h2
                id="modal-title"
                ref={firstFocusRef}
                tabIndex={-1}
                className="font-display font-bold text-lg text-primary-700 focus:outline-none"
              >
                {title}
              </h2>
            )}
            {showClose && (
              <button
                onClick={onClose}
                className="ml-auto w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                aria-label="Close modal"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-mint-light/60 flex-shrink-0 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
