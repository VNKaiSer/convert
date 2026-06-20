"use client"

import { useEffect, useMemo, useState } from "react"
import { DIFF_PAGE_SIZE } from "@/lib/json-compare/constants"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Copy, Download, ChevronLeft, ChevronRight, List, GitBranch } from "lucide-react"
import type { JsonDiffResult } from "@/lib/json-compare"
import type { DiffSortState } from "@/lib/json-compare/types"
import type { DiffViewMode } from "@/lib/json-compare/compare-workspace"
import { buildDiffTree, filterDiffs, sortDiffs, toggleSort } from "@/lib/json-compare/diff-operations"
import { DiffTable } from "./diff-table"
import { DiffTreeView } from "./diff-tree-view"

interface DiffViewerProps {
  diffs: JsonDiffResult[]
  filter: string
  sort: DiffSortState
  viewMode: DiffViewMode
  activePath: string | null
  onFilterChange: (value: string) => void
  onSortChange: (sort: DiffSortState) => void
  onViewModeChange: (mode: DiffViewMode) => void
  onSelectPath: (path: string | null) => void
  onCopy: () => void
  onDownloadCsv: () => void
}

export function DiffViewer({
  diffs,
  filter,
  sort,
  viewMode,
  activePath,
  onFilterChange,
  onSortChange,
  onViewModeChange,
  onSelectPath,
  onCopy,
  onDownloadCsv,
}: DiffViewerProps) {
  const [page, setPage] = useState(0)

  const filteredDiffs = useMemo(() => filterDiffs(diffs, filter), [diffs, filter])

  const totalPages = Math.max(1, Math.ceil(filteredDiffs.length / DIFF_PAGE_SIZE))

  useEffect(() => {
    setPage(0)
  }, [filter, diffs.length])

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1))
  }, [page, totalPages])

  const originalIndices = useMemo(() => {
    const map = new Map<JsonDiffResult, number>()
    diffs.forEach((diff, index) => map.set(diff, index + 1))
    return map
  }, [diffs])

  const sortedDiffs = useMemo(
    () => sortDiffs(filteredDiffs, sort, originalIndices),
    [filteredDiffs, sort, originalIndices]
  )

  const diffTree = useMemo(() => buildDiffTree(sortedDiffs), [sortedDiffs])

  const activeIndex = useMemo(() => {
    if (!activePath) return null
    const index = sortedDiffs.findIndex((diff) => diff.path === activePath)
    return index >= 0 ? index : null
  }, [activePath, sortedDiffs])

  const navigate = (direction: -1 | 1) => {
    if (sortedDiffs.length === 0) return

    const currentIndex =
      activePath !== null ? sortedDiffs.findIndex((diff) => diff.path === activePath) : -1

    const nextIndex =
      currentIndex < 0
        ? direction === 1
          ? 0
          : sortedDiffs.length - 1
        : (currentIndex + direction + sortedDiffs.length) % sortedDiffs.length

    onSelectPath(sortedDiffs[nextIndex]?.path ?? null)
  }

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-md">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-bold text-lg dark:text-gray-100">Differences</h3>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <Input
              placeholder="Filter path or value..."
              value={filter}
              onChange={(e) => onFilterChange(e.target.value)}
              className="w-full sm:w-[260px] h-9 dark:bg-gray-700 dark:border-gray-600"
            />
            <Button
              variant={viewMode === "flat" ? "default" : "outline"}
              size="sm"
              onClick={() => onViewModeChange("flat")}
              className="gap-1"
            >
              <List className="h-4 w-4" /> Flat
            </Button>
            <Button
              variant={viewMode === "tree" ? "default" : "outline"}
              size="sm"
              onClick={() => onViewModeChange("tree")}
              className="gap-1"
            >
              <GitBranch className="h-4 w-4" /> Tree
            </Button>
            <Button onClick={onCopy} variant="outline" size="icon" className="h-9 w-9 shrink-0 dark:border-gray-600" title="Copy JSON">
              <Copy className="h-4 w-4" />
            </Button>
            <Button onClick={onDownloadCsv} variant="outline" size="icon" className="h-9 w-9 shrink-0 dark:border-gray-600" title="Download CSV">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {sortedDiffs.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[100px] text-center">
                Diff {activeIndex !== null ? activeIndex + 1 : 0} / {sortedDiffs.length}
              </span>
              <Button variant="outline" size="sm" onClick={() => navigate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          {sortedDiffs.length > DIFF_PAGE_SIZE && (
            <>
              <span className="text-sm text-muted-foreground ml-2">
                Page {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Prev page
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Next page
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        {viewMode === "flat" ? (
          sortedDiffs.length === 0 && diffs.length > 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              No differences match your filter.
            </div>
          ) : (
            <DiffTable
              diffs={sortedDiffs}
              sort={sort}
              activeIndex={activeIndex}
              page={page}
              pageSize={DIFF_PAGE_SIZE}
              onSort={(column) => onSortChange(toggleSort(sort, column))}
              onSelect={(index) => onSelectPath(index !== null ? sortedDiffs[index]?.path ?? null : null)}
            />
          )
        ) : (
          <DiffTreeView
            root={diffTree}
            activePath={activePath}
            onSelectPath={onSelectPath}
          />
        )}
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        Note: Arrays are compared by index (e.g. <code>$.data.loans[0]</code>). Object key order does not affect comparison.
      </div>
    </Card>
  )
}
