"use client"

import { useMemo } from "react"
import { ChevronRight } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { DiffTreeNode } from "@/lib/json-compare/types"
import type { JsonDiffResult } from "@/lib/json-compare"
import {
  countDiffTreeNodes,
  getDiffFieldLabel,
  getDiffSideLabel,
  getDiffTypeBadgeClass,
  pathContainsNode,
} from "@/lib/json-compare/diff-operations"
import { cn } from "@/lib/utils"

interface DiffTreeViewProps {
  root: DiffTreeNode
  activePath: string | null
  onSelectPath: (path: string) => void
}

function DiffLeafRow({
  diff,
  activePath,
  onSelectPath,
}: {
  diff: JsonDiffResult
  activePath: string | null
  onSelectPath: (path: string) => void
}) {
  const isActive = activePath === diff.path
  const fieldLabel = getDiffFieldLabel(diff.path)

  return (
    <button
      type="button"
      onClick={() => onSelectPath(diff.path)}
      className={cn(
        "w-full text-left rounded-md border p-2.5 transition-colors",
        isActive
          ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60"
      )}
    >
      <div className="mb-1.5 space-y-1">
        <div className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
          {fieldLabel}
        </div>
        <div className="font-mono text-xs text-muted-foreground break-all">{diff.path}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
            getDiffTypeBadgeClass(diff.type)
          )}
        >
          {diff.type}
        </span>
        <span className="text-xs text-muted-foreground">{getDiffSideLabel(diff)}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
        <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded break-all">
          <span className="text-[10px] uppercase text-blue-600 dark:text-blue-400 block mb-1">
            JSON 1
          </span>
          {diff.json1}
        </div>
        <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded break-all">
          <span className="text-[10px] uppercase text-purple-600 dark:text-purple-400 block mb-1">
            JSON 2
          </span>
          {diff.json2}
        </div>
      </div>
    </button>
  )
}

function DiffTreeNodeView({
  node,
  activePath,
  onSelectPath,
  depth = 0,
}: {
  node: DiffTreeNode
  activePath: string | null
  onSelectPath: (path: string) => void
  depth?: number
}) {
  const diffCount = useMemo(() => countDiffTreeNodes(node), [node])
  const isExpandable = node.children.length > 0 || node.diffs.length > 0
  const defaultOpen = pathContainsNode(node.path, activePath)

  if (!isExpandable) return null

  const isBranch = node.children.length > 0

  if (!isBranch && node.diffs.length > 0) {
    return (
      <div style={{ paddingLeft: depth * 14 }} className="space-y-2 py-1">
        {node.diffs.map((diff, index) => (
          <DiffLeafRow
            key={`${diff.path}-${index}`}
            diff={diff}
            activePath={activePath}
            onSelectPath={onSelectPath}
          />
        ))}
      </div>
    )
  }

  return (
    <Collapsible defaultOpen={defaultOpen} className="group py-0.5">
      <div style={{ paddingLeft: depth * 14 }}>
        <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-mono hover:bg-gray-100 dark:hover:bg-gray-800/60">
          <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
          <span
            className={cn(
              "font-semibold",
              pathContainsNode(node.path, activePath) && "text-blue-600 dark:text-blue-400"
            )}
          >
            {node.label}
          </span>
          <span className="text-xs text-muted-foreground truncate">{node.path}</span>
          <span className="ml-auto text-xs text-muted-foreground shrink-0">({diffCount})</span>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="space-y-1">
          {node.children.map((child) => (
            <DiffTreeNodeView
              key={child.path}
              node={child}
              activePath={activePath}
              onSelectPath={onSelectPath}
              depth={depth + 1}
            />
          ))}
          {node.diffs.length > 0 && (
            <div style={{ paddingLeft: (depth + 1) * 14 }} className="space-y-2 py-1">
              {node.diffs.map((diff, index) => (
                <DiffLeafRow
                  key={`${diff.path}-${index}`}
                  diff={diff}
                  activePath={activePath}
                  onSelectPath={onSelectPath}
                />
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function DiffTreeView({ root, activePath, onSelectPath }: DiffTreeViewProps) {
  if (root.children.length === 0 && root.diffs.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
        No differences found.
      </div>
    )
  }

  return (
    <div className="px-2 py-2">
      {root.children.map((child) => (
        <DiffTreeNodeView
          key={child.path}
          node={child}
          activePath={activePath}
          onSelectPath={onSelectPath}
        />
      ))}
      {root.diffs.length > 0 && (
        <div className="space-y-2 py-1">
          {root.diffs.map((diff, index) => (
            <DiffLeafRow
              key={`${diff.path}-${index}`}
              diff={diff}
              activePath={activePath}
              onSelectPath={onSelectPath}
            />
          ))}
        </div>
      )}
    </div>
  )
}
