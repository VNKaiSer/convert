"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, ChevronDown, ChevronUp } from "lucide-react"
import type { ApiBatchFailure, ApiBatchStats } from "@/lib/json-compare/types"

interface BatchFailuresPanelProps {
  stats: ApiBatchStats
  batchCount: number
}

const PAGE_SIZE = 20

export function BatchFailuresPanel({ stats, batchCount }: BatchFailuresPanelProps) {
  const [expanded, setExpanded] = useState(true)
  const [page, setPage] = useState(0)

  const failures = stats.failures ?? []
  const totalPages = Math.max(1, Math.ceil(failures.length / PAGE_SIZE))

  const pageFailures = useMemo(() => {
    const start = page * PAGE_SIZE
    return failures.slice(start, start + PAGE_SIZE)
  }, [failures, page])

  if (failures.length === 0) return null

  const handleDownload = () => {
    const payload = {
      savedAt: new Date().toISOString(),
      summary: {
        totalBatches: batchCount,
        successBatches: stats.successBatches,
        failedBatches: stats.failedBatches,
      },
      failures,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "batch-failures.json"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="border-red-200 dark:border-red-900/50 dark:bg-gray-800">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base text-red-700 dark:text-red-400">
            Failed batches ({stats.failedBatches} / {batchCount})
          </CardTitle>
          <div className="flex items-center gap-2">
            {stats.failureFile && (
              <span className="text-xs font-mono text-muted-foreground">{stats.failureFile}</span>
            )}
            <Button type="button" variant="outline" size="sm" onClick={handleDownload} className="gap-1">
              <Download className="h-3.5 w-3.5" /> Download JSON
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              className="gap-1"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {expanded ? "Hide" : "Show"}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {stats.successBatches} ok · {failures.length} failed endpoint call(s) saved to file
        </p>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3 pt-0">
          <div className="overflow-x-auto max-h-[360px] overflow-y-auto rounded-lg border dark:border-gray-700">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                <tr>
                  <th className="px-3 py-2 font-semibold">Batch</th>
                  <th className="px-3 py-2 font-semibold">EP</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold min-w-[200px]">Error</th>
                  <th className="px-3 py-2 font-semibold min-w-[240px]">Response</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {pageFailures.map((failure, index) => (
                  <FailureRow key={`${failure.batchIndex}-${failure.slot}-${index}`} failure={failure} />
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 text-xs">
              <span className="text-muted-foreground">
                Page {page + 1} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Prev
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function FailureRow({ failure }: { failure: ApiBatchFailure }) {
  return (
    <tr className="align-top hover:bg-red-50/30 dark:hover:bg-red-950/20">
      <td className="px-3 py-2 font-mono whitespace-nowrap">
        #{failure.batchNumber}
        <div className="text-[10px] text-muted-foreground font-normal max-w-[140px] truncate" title={failure.label}>
          {failure.label}
        </div>
      </td>
      <td className="px-3 py-2 font-mono">{failure.slot}</td>
      <td className="px-3 py-2 font-mono">{failure.status || "—"}</td>
      <td className="px-3 py-2 text-red-700 dark:text-red-400 break-words">{failure.error}</td>
      <td className="px-3 py-2">
        {failure.responseBody ? (
          <pre className="max-h-[120px] overflow-auto rounded bg-gray-100 dark:bg-gray-900 p-2 font-mono text-[10px] whitespace-pre-wrap break-words">
            {failure.responseBody}
          </pre>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  )
}
