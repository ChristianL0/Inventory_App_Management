import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between pt-2 text-sm text-ink/55 dark:text-paper/55">
      <p>
        Showing <span className="font-medium text-ink dark:text-paper">{from}–{to}</span> of{" "}
        <span className="font-medium text-ink dark:text-paper">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          className="btn-ghost !px-2"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="px-2 font-mono text-xs">
          {page} / {totalPages}
        </span>
        <button
          className="btn-ghost !px-2"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
