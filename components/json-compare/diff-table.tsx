"use client"

import type { JsonDiffResult } from "@/lib/json-compare"
import type { DiffSortColumn, DiffSortState } from "@/lib/json-compare/types"
import { getDiffTypeBadgeClass } from "@/lib/json-compare/diff-operations"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

interface DiffTableProps {
  diffs: JsonDiffResult[]
  sort: DiffSortState
  activeIndex: number | null
  page: number
  pageSize: number
  onSort: (column: DiffSortColumn) => void
  onSelect: (index: number) => void
}

function SortIcon({ column, sort }: { column: DiffSortColumn; sort: DiffSortState }) {
  if (sort.column !== column) return <ArrowUpDown className="h-3 w-3 opacity-40" />
  return sort.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
}

function SortableHeader({
  label,
  column,
  sort,
  onSort,
  className = "",
}: {
  label: string
  column: DiffSortColumn
  sort: DiffSortState
  onSort: (column: DiffSortColumn) => void
  className?: string
}) {
  return (
    <th className={`px-4 py-3 font-semibold ${className}`}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100"
      >
        {label}
        <SortIcon column={column} sort={sort} />
      </button>
    </th>
  )
}

export function DiffTable({
  diffs,
  sort,
  activeIndex,
  page,
  pageSize,
  onSort,
  onSelect,
}: DiffTableProps) {
  const pageStart = page * pageSize
  const pageDiffs = diffs.slice(pageStart, pageStart + pageSize)

  return (
    <table className="w-full text-sm text-left border-collapse">
      <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400 border-b dark:border-gray-700">
        <tr>
          <SortableHeader label="#" column="index" sort={sort} onSort={onSort} />
          <SortableHeader label="Type" column="type" sort={sort} onSort={onSort} className="w-[140px]" />
          <SortableHeader label="Path" column="path" sort={sort} onSort={onSort} className="min-w-[200px]" />
          <SortableHeader label="JSON 1" column="json1" sort={sort} onSort={onSort} className="min-w-[300px]" />
          <SortableHeader label="JSON 2" column="json2" sort={sort} onSort={onSort} className="min-w-[300px]" />
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
        {diffs.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              No differences found.
            </td>
          </tr>
        ) : (
          pageDiffs.map((diff, pageIdx) => {
            const idx = pageStart + pageIdx
            return (
            <tr
              key={`${diff.path}-${idx}`}
              onClick={() => onSelect(idx)}
              className={`cursor-pointer transition-colors ${
                activeIndex === idx
                  ? "bg-blue-50 dark:bg-blue-900/20"
                  : "hover:bg-gray-50/50 dark:hover:bg-gray-700/50"
              }`}
            >
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{idx + 1}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getDiffTypeBadgeClass(diff.type)}`}>
                  {diff.type}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900 dark:text-gray-200 break-all">
                {diff.path}
              </td>
              <td className="px-4 py-3">
                <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded-md font-mono text-xs text-gray-800 dark:text-gray-300 max-h-[200px] overflow-auto whitespace-pre-wrap break-words">
                  {diff.json1}
                </div>
                <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 font-mono">type: {diff.json1Type}</div>
              </td>
              <td className="px-4 py-3">
                <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded-md font-mono text-xs text-gray-800 dark:text-gray-300 max-h-[200px] overflow-auto whitespace-pre-wrap break-words">
                  {diff.json2}
                </div>
                <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 font-mono">type: {diff.json2Type}</div>
              </td>
            </tr>
            )
          })
        )}
      </tbody>
    </table>
  )
}
