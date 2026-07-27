"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { classNames } from "../utils/class-names";
import { DEFAULT_PAGE_SIZE_OPTIONS } from "../constants/ui";
import { FOCUS_RING, PRESSABLE } from "./styles";
import { Input } from "./input";
import { Select } from "./select";
import { Pagination } from "./pagination";

export interface TableColumn<T extends object> { key: string; label: string; sortable?: boolean; render?: (row: T) => React.ReactNode; }
interface DataTableProps<T extends object> { columns: TableColumn<T>[]; data: T[]; defaultRowsPerPage?: number; rowsPerPageOptions?: number[]; }
function getColumnValue<T extends object>(row: T, key: string): unknown { return row[key as keyof T]; }

export function DataTable<T extends object>({ columns, data, defaultRowsPerPage = 10, rowsPerPageOptions = DEFAULT_PAGE_SIZE_OPTIONS }: DataTableProps<T>) {
  const t = useTranslation();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const filtered = useMemo(() => data.filter((row) => columns.some((column) => { const value = getColumnValue(row, column.key); return (typeof value === "string" || typeof value === "number") && String(value).toLowerCase().includes(search.toLowerCase()); })), [columns, data, search]);
  const sorted = useMemo(() => { if (!sortKey) return filtered; return [...filtered].sort((a, b) => { const av = getColumnValue(a, sortKey); const bv = getColumnValue(b, sortKey); if (!Number.isNaN(Number(av)) && !Number.isNaN(Number(bv))) return sortAsc ? Number(av) - Number(bv) : Number(bv) - Number(av); if (typeof av === "string" && typeof bv === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av); return 0; }); }, [filtered, sortAsc, sortKey]);
  const totalPages = Math.max(Math.ceil(sorted.length / rowsPerPage), 1);
  const paginatedRows = sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const toggleSort = (key: string) => { if (sortKey === key) setSortAsc((value) => !value); else { setSortKey(key); setSortAsc(true); } };

  return (
    <div className="overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
      <div className="flex flex-col items-center justify-between gap-3 border-b border-[rgb(var(--border))] p-4 md:flex-row">
        <label className="w-full md:w-64">
          <span className="sr-only">{t("common.searchTable")}</span>
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          />
        </label>
        <div className="flex flex-wrap items-center gap-4 text-sm text-[rgb(var(--secondary-text))]">
          <label className="flex items-center gap-2">
            {t("common.rowsPerPage")}
            <Select
              value={rowsPerPage}
              onChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(1); }}
            >
              {rowsPerPageOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </Select>
          </label>
          <div className="flex items-center gap-2">
            {t("common.pageOf", { page, total: totalPages })}
            <button
              type="button"
              onClick={() => setSortAsc((value) => !value)}
              className={classNames(
                "rounded-lg bg-[rgb(var(--border))] px-2 py-1 text-xs text-[rgb(var(--text))] hover:brightness-110 active:brightness-90",
                PRESSABLE,
                FOCUS_RING,
              )}
              aria-label={sortAsc ? t("common.sortAscending") : t("common.sortDescending")}
              title={t("common.reverseSort")}
            >
              {sortAsc ? "↑" : "↓"}
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full bg-[rgb(var(--card))] text-sm text-[rgb(var(--text))]">
          <thead className="border-b border-[rgb(var(--border))]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={sortKey === column.key ? (sortAsc ? "ascending" : "descending") : column.sortable ? "none" : undefined}
                  className={classNamesForHeader(column.sortable)}
                  onClick={() => column.sortable && toggleSort(column.key)}
                >
                  {column.label} {column.sortable && sortKey === column.key && <span aria-hidden="true">{sortAsc ? "▲" : "▼"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 text-center text-[rgb(var(--secondary-text))]">
                  {t("common.noResults")}
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, index) => (
                <tr key={index} className="border-b border-[rgb(var(--border))] transition-colors last:border-0 hover:bg-[rgb(var(--border)/0.3)]">
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4">
                      {column.render ? column.render(row) : (getColumnValue(row, column.key) as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function classNamesForHeader(sortable?: boolean) {
  return sortable
    ? "cursor-pointer select-none px-6 py-3 text-left font-medium text-[rgb(var(--secondary-text))] transition-colors hover:text-[rgb(var(--text))] active:text-[rgb(var(--text))]"
    : "select-none px-6 py-3 text-left font-medium text-[rgb(var(--secondary-text))]";
}

export default DataTable;
