import { classNames } from "../utils/class-names";
import { useTranslation } from "../../i18n/useTranslation";
import { FOCUS_RING, PRESSABLE } from "./styles";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const MAX_VISIBLE_PAGES = 7;

function getVisiblePages(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);

  const withEllipsis: Array<number | "ellipsis"> = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) withEllipsis.push("ellipsis");
    withEllipsis.push(page);
  });
  return withEllipsis;
}

const navButtonClasses =
  "rounded-lg bg-[rgb(var(--border))] px-3 py-1 text-[rgb(var(--text))] hover:brightness-110 active:brightness-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:brightness-100";

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const t = useTranslation();
  const visiblePages = getVisiblePages(currentPage, totalPages);

  return (
    <nav
      aria-label={t("common.pageOf", { page: currentPage, total: totalPages })}
      className="flex flex-wrap items-center justify-center gap-2 border-t border-[rgb(var(--border))] p-4"
    >
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label={t("common.previous")}
        className={classNames(navButtonClasses, PRESSABLE, FOCUS_RING)}
      >
        {t("common.previous")}
      </button>
      {visiblePages.map((page, index) =>
        page === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="px-2 text-[rgb(var(--secondary-text))]" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            type="button"
            key={page}
            onClick={() => onPageChange(page)}
            aria-current={currentPage === page ? "page" : undefined}
            className={classNames(
              "min-w-9 rounded-lg px-3 py-1",
              PRESSABLE,
              FOCUS_RING,
              currentPage === page
                ? "bg-[rgb(var(--button))] text-[rgb(var(--button-text))]"
                : "bg-[rgb(var(--border))] text-[rgb(var(--text))] hover:brightness-110 active:brightness-90",
            )}
          >
            {page}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label={t("common.next")}
        className={classNames(navButtonClasses, PRESSABLE, FOCUS_RING)}
      >
        {t("common.next")}
      </button>
    </nav>
  );
}
