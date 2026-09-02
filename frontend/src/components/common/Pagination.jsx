/**
 * Pagination.jsx
 * Smart pagination with ellipsis for large page counts.
 *
 * Usage:
 *   <Pagination
 *     currentPage={page}
 *     totalPages={totalPages}
 *     onPageChange={(p) => setPage(p)}
 *     totalItems={total}
 *     itemsPerPage={limit}
 *   />
 */
import React from 'react';

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = [];
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '...', total);
  } else if (current >= total - 3) {
    pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return pages;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  className = '',
}) {
  if (!totalPages || totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  // Range display: "Showing 21–40 of 150"
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end   = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Range info */}
      {totalItems != null && (
        <p className="text-sm text-gray-500">
          Showing <span className="font-semibold text-primary-600">{start}–{end}</span> of{' '}
          <span className="font-semibold text-primary-600">{totalItems}</span>
        </p>
      )}

      {/* Page buttons */}
      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-mint-dark/20 text-gray-500 hover:bg-mint-light hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Previous page"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Page numbers */}
        {pages.map((page, i) =>
          page === '...' ? (
            <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm">
              ···
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                page === currentPage
                  ? 'bg-green-gradient text-white shadow-glow-green'
                  : 'border border-mint-dark/20 text-gray-600 hover:bg-mint-light hover:text-primary-600'
              }`}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-mint-dark/20 text-gray-500 hover:bg-mint-light hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Next page"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
