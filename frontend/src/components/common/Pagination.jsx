import { useEffect, useState } from 'react';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import {
  clampPage,
  getPaginationRange,
  getVisiblePageNumbers,
  PAGE_SIZE_OPTIONS,
} from '../../lib/pagination.js';

const compactButtonClass = 'px-3 py-1.5 min-h-8';
const compactInputClass = 'h-8 w-14 px-2 py-1 text-center';
const compactSelectClass = 'h-8 w-[4.5rem] px-2 py-1';

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  disabled = false,
  itemLabel = 'results',
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}) {
  const [pageInput, setPageInput] = useState(String(page));
  const safeTotalPages = Math.max(0, totalPages);
  const hasMultiplePages = safeTotalPages > 1;
  const showSummary = typeof total === 'number' && typeof limit === 'number';
  const showLimitControl = Boolean(onLimitChange);
  const visiblePages = getVisiblePageNumbers(page, safeTotalPages);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  if (!showSummary && !hasMultiplePages && !showLimitControl) {
    return null;
  }

  const range = showSummary ? getPaginationRange({ page, limit, total }) : null;
  const summaryText =
    range?.summary === 'No results'
      ? `No ${itemLabel}`
      : range
        ? `${range.summary} ${itemLabel}`
        : `Page ${page} of ${safeTotalPages || 1}`;

  const handlePageSubmit = (event) => {
    event.preventDefault();
    const parsed = Number.parseInt(pageInput, 10);
    if (Number.isNaN(parsed)) {
      setPageInput(String(page));
      return;
    }

    onPageChange(clampPage(parsed, safeTotalPages));
  };

  const handleLimitChange = (event) => {
    const nextLimit = Number.parseInt(event.target.value, 10);
    if (!Number.isNaN(nextLimit)) {
      onLimitChange(nextLimit);
    }
  };

  return (
    <nav
      aria-label="Pagination"
      className="rounded-lg border border-slate-200 bg-white px-4 py-3"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-600">{summaryText}</p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {showLimitControl ? (
            <div className="flex items-center gap-2">
              <label
                htmlFor={`page-size-${itemLabel}`}
                className="whitespace-nowrap text-sm text-slate-600"
              >
                Rows per page
              </label>
              <Select
                id={`page-size-${itemLabel}`}
                value={limit}
                onChange={handleLimitChange}
                disabled={disabled}
                className={compactSelectClass}
                aria-label="Rows per page"
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {hasMultiplePages ? (
            <>
              <div
                className="hidden h-6 w-px bg-slate-200 sm:block"
                aria-hidden="true"
              />

              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  className={compactButtonClass}
                  disabled={disabled || page <= 1}
                  onClick={() => onPageChange(page - 1)}
                >
                  Previous
                </Button>

                {visiblePages.map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant={pageNumber === page ? 'primary' : 'secondary'}
                    className={`${compactButtonClass} min-w-8`}
                    disabled={disabled}
                    aria-current={pageNumber === page ? 'page' : undefined}
                    onClick={() => onPageChange(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                ))}

                <Button
                  variant="secondary"
                  className={compactButtonClass}
                  disabled={disabled || page >= safeTotalPages}
                  onClick={() => onPageChange(page + 1)}
                >
                  Next
                </Button>
              </div>

              <div
                className="hidden h-6 w-px bg-slate-200 sm:block"
                aria-hidden="true"
              />

              <form
                onSubmit={handlePageSubmit}
                className="flex items-center gap-2"
              >
                <span className="whitespace-nowrap text-sm text-slate-600">Page</span>
                <Input
                  id={`page-number-${itemLabel}`}
                  type="number"
                  min={1}
                  max={safeTotalPages}
                  value={pageInput}
                  onChange={(event) => setPageInput(event.target.value)}
                  disabled={disabled}
                  className={compactInputClass}
                  aria-label="Page number"
                />
                <span className="whitespace-nowrap text-sm text-slate-500">
                  of {safeTotalPages}
                </span>
                <Button
                  type="submit"
                  variant="secondary"
                  className={compactButtonClass}
                  disabled={disabled}
                >
                  Go
                </Button>
              </form>
            </>
          ) : (
            <span className="text-sm text-slate-500">Page 1 of 1</span>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Pagination;
