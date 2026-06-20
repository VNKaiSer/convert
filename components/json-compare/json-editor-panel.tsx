"use client"

import { forwardRef, useMemo } from "react"
import { LARGE_JSON_LINE_THRESHOLD } from "@/lib/json-compare/constants"
import { Card, CardContent } from "@/components/ui/card"
import { FileJson } from "lucide-react"
import {
  TextareaWithLineNumbers,
  type TextareaWithLineNumbersHandle,
} from "@/components/textarea-with-line-numbers"
import type { JsonDiffResult } from "@/lib/json-compare"
import {
  buildLineHighlights,
  findLineForPath,
  getDiffSideLabel,
  getDiffTypeColor,
} from "@/lib/json-compare/diff-operations"

interface JsonEditorPanelProps {
  title: string
  iconColor: string
  value: string
  placeholder: string
  onChange: (value: string) => void
  diffs: JsonDiffResult[]
  activePath?: string
}

export const JsonEditorPanel = forwardRef<TextareaWithLineNumbersHandle, JsonEditorPanelProps>(
  function JsonEditorPanel(
    { title, iconColor, value, placeholder, onChange, diffs, activePath },
    ref
  ) {
    const lineCount = useMemo(() => (value ? value.split("\n").length : 0), [value])
    const liteMode = lineCount > LARGE_JSON_LINE_THRESHOLD

    const activeDiff = useMemo(
      () => (activePath ? diffs.find((d) => d.path === activePath) : undefined),
      [activePath, diffs]
    )

    const highlights = useMemo(() => {
      if (liteMode) {
        if (!activePath) return []
        const line = findLineForPath(value, activePath)
        const activeDiffItem = diffs.find((d) => d.path === activePath)
        if (line <= 0 || !activeDiffItem) return []
        return [{ line, className: getDiffTypeColor(activeDiffItem.type) }]
      }
      return buildLineHighlights(value, diffs, activePath).map((item) => ({
        line: item.line,
        className: getDiffTypeColor(item.type),
      }))
    }, [liteMode, value, diffs, activePath])

    const activeLine = useMemo(() => {
      if (!activePath) return undefined
      return findLineForPath(value, activePath)
    }, [value, activePath])

    return (
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 rounded-t-xl">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 flex-wrap">
            <FileJson className={`w-4 h-4 ${iconColor}`} /> {title}
            {liteMode && (
              <span className="text-xs font-normal text-muted-foreground">
                ({lineCount.toLocaleString()} lines · lite
                {activeLine ? ` · line ${activeLine}` : ""})
              </span>
            )}
            {activeDiff && (
              <span className="text-xs font-normal text-muted-foreground">
                · {getDiffSideLabel(activeDiff)}
              </span>
            )}
          </h3>
        </div>
        <CardContent className="p-0">
          <TextareaWithLineNumbers
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            highlightedLines={highlights}
            activeLine={activeLine}
            liteMode={liteMode}
            wordWrap={liteMode}
            className="min-h-[400px] text-sm border-0 focus-visible:ring-0 rounded-none rounded-b-xl dark:bg-gray-800"
          />
        </CardContent>
      </Card>
    )
  }
)
