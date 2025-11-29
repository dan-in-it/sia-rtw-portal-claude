import React from 'react';
import { clsx } from 'clsx';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPreviousNext?: boolean;
  maxVisiblePages?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  showPreviousNext = true,
  maxVisiblePages = 7,
}) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - 1, 1);
    const rightSiblingIndex = Math.min(currentPage + 1, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftRange = Array.from({ length: 5 }, (_, i) => i + 1);
      return [...leftRange, '...', totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightRange = Array.from({ length: 5 }, (_, i) => totalPages - 4 + i);
      return [1, '...', ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav className="flex items-center justify-center gap-1">
      {showPreviousNext && (
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={clsx(
            'px-3 py-2 rounded-md text-sm font-medium transition-colors',
            currentPage === 1
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100'
          )}
        >
          Previous
        </button>
      )}

      {pageNumbers.map((page, index) => {
        if (page === '...') {
          return (
            <span key={`dots-${index}`} className="px-3 py-2 text-gray-500">
              ...
            </span>
          );
        }

        const pageNum = page as number;
        const isActive = pageNum === currentPage;

        return (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={clsx(
              'px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            {pageNum}
          </button>
        );
      })}

      {showPreviousNext && (
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={clsx(
            'px-3 py-2 rounded-md text-sm font-medium transition-colors',
            currentPage === totalPages
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100'
          )}
        >
          Next
        </button>
      )}
    </nav>
  );
};
