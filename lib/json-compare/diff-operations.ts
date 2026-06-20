import type { JsonDiffResult } from "@/lib/json-compare"
import type { DiffGroup, DiffSortColumn, DiffSortState, DiffTreeNode, LineHighlight, SortDirection } from "./types"
import { findLineForPath, findLinesForPath, parseJsonPath } from "./path-locator"

export { findLineForPath, findLinesForPath }

export function filterDiffs(diffs: JsonDiffResult[], keyword: string): JsonDiffResult[] {
  if (!keyword.trim()) return diffs
  const lower = keyword.toLowerCase()
  return diffs.filter((diff) =>
    [diff.type, diff.path, diff.json1, diff.json2, diff.json1Type, diff.json2Type]
      .join(" ")
      .toLowerCase()
      .includes(lower)
  )
}

function compareValues(
  a: string,
  b: string,
  direction: SortDirection
): number {
  const result = a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  return direction === "asc" ? result : -result
}

export function sortDiffs(
  diffs: JsonDiffResult[],
  sort: DiffSortState,
  originalIndices?: Map<JsonDiffResult, number>
): JsonDiffResult[] {
  const sorted = [...diffs]
  const { column, direction } = sort

  sorted.sort((a, b) => {
    switch (column) {
      case "index": {
        const idxA = originalIndices?.get(a) ?? 0
        const idxB = originalIndices?.get(b) ?? 0
        return direction === "asc" ? idxA - idxB : idxB - idxA
      }
      case "type":
        return compareValues(a.type, b.type, direction)
      case "path":
        return compareValues(a.path, b.path, direction)
      case "json1":
        return compareValues(a.json1, b.json1, direction)
      case "json2":
        return compareValues(a.json2, b.json2, direction)
      default:
        return 0
    }
  })

  return sorted
}

export function toggleSort(
  current: DiffSortState,
  column: DiffSortColumn
): DiffSortState {
  if (current.column === column) {
    return { column, direction: current.direction === "asc" ? "desc" : "asc" }
  }
  return { column, direction: "asc" }
}

export function getObjectGroupKey(path: string): string {
  const withoutRoot = path.replace(/^\$\.?/, "")
  if (!withoutRoot) return "$"

  const segments = withoutRoot.split(".")
  if (segments.length <= 2) return `$.${segments.join(".")}`

  return `$.${segments.slice(0, 2).join(".")}`
}

function appendPathSegment(basePath: string, segment: string | number): string {
  if (typeof segment === "number") {
    return `${basePath}[${segment}]`
  }
  return basePath === "$" ? `$.${segment}` : `${basePath}.${segment}`
}

function segmentLabel(segment: string | number): string {
  return typeof segment === "number" ? `[${segment}]` : segment
}

function sortTreeChildren(node: DiffTreeNode) {
  node.children.sort((a, b) => {
    const aMatch = a.label.match(/^\[(\d+)\]$/)
    const bMatch = b.label.match(/^\[(\d+)\]$/)

    if (aMatch && bMatch) {
      return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10)
    }
    if (aMatch) return -1
    if (bMatch) return 1
    return a.label.localeCompare(b.label, undefined, { numeric: true })
  })

  for (const child of node.children) {
    sortTreeChildren(child)
  }
}

function insertDiffIntoTree(root: DiffTreeNode, diff: JsonDiffResult) {
  const segments = parseJsonPath(diff.path)
  if (segments.length === 0) {
    root.diffs.push(diff)
    return
  }

  let current = root
  let path = "$"

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const isLast = i === segments.length - 1
    path = appendPathSegment(path, segment)
    const label = segmentLabel(segment)

    let child = current.children.find((node) => node.path === path)
    if (!child) {
      child = { label, path, diffs: [], children: [] }
      current.children.push(child)
    }

    if (isLast) {
      child.diffs.push(diff)
      return
    }

    current = child
  }
}

export function buildDiffTree(diffs: JsonDiffResult[]): DiffTreeNode {
  const root: DiffTreeNode = { label: "$", path: "$", diffs: [], children: [] }

  for (const diff of diffs) {
    insertDiffIntoTree(root, diff)
  }

  sortTreeChildren(root)
  return root
}

export function countDiffTreeNodes(node: DiffTreeNode): number {
  let count = node.diffs.length
  for (const child of node.children) {
    count += countDiffTreeNodes(child)
  }
  return count
}

export function pathContainsNode(nodePath: string, activePath: string | null): boolean {
  if (!activePath) return false
  if (activePath === nodePath) return true
  return activePath.startsWith(`${nodePath}.`) || activePath.startsWith(`${nodePath}[`)
}

export function getDiffSideLabel(diff: JsonDiffResult): string {
  if (diff.json1Type === "missing") return "Thiếu JSON 1"
  if (diff.json2Type === "missing") return "Thiếu JSON 2"
  if (diff.type === "TYPE_MISMATCH") return "Khác type"
  return "Khác giá trị"
}

/** Last segment of a JSON path — the field or index that differs. */
export function getDiffFieldLabel(path: string): string {
  const segments = parseJsonPath(path)
  if (segments.length === 0) return path

  const last = segments[segments.length - 1]
  return typeof last === "number" ? `[${last}]` : String(last)
}

export function groupDiffsByObject(diffs: JsonDiffResult[]): DiffGroup[] {
  const map = new Map<string, JsonDiffResult[]>()

  for (const diff of diffs) {
    const key = getObjectGroupKey(diff.path)
    const group = map.get(key) ?? []
    group.push(diff)
    map.set(key, group)
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupPath, groupDiffs]) => ({ groupPath, diffs: groupDiffs }))
}

export function buildLineHighlights(
  jsonText: string,
  diffs: JsonDiffResult[],
  activePath?: string
): LineHighlight[] {
  const lineMap = new Map<number, JsonDiffResult["type"]>()

  for (const diff of diffs) {
    const line = findLineForPath(jsonText, diff.path)
    if (line > 0 && !lineMap.has(line)) {
      lineMap.set(line, diff.type)
    }
  }

  if (activePath) {
    const line = findLineForPath(jsonText, activePath)
    const activeDiff = diffs.find((d) => d.path === activePath)
    if (line > 0 && activeDiff) {
      lineMap.set(line, activeDiff.type)
    }
  }

  return Array.from(lineMap.entries()).map(([line, type]) => ({ line, type }))
}

export function getDiffTypeColor(type: JsonDiffResult["type"]): string {
  switch (type) {
    case "MISSING_FIELD":
      return "bg-yellow-200/60 dark:bg-yellow-900/40"
    case "TYPE_MISMATCH":
      return "bg-purple-200/60 dark:bg-purple-900/40"
    case "VALUE_MISMATCH":
      return "bg-red-200/60 dark:bg-red-900/40"
  }
}

export function getDiffTypeBadgeClass(type: JsonDiffResult["type"]): string {
  switch (type) {
    case "MISSING_FIELD":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500"
    case "TYPE_MISMATCH":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
    case "VALUE_MISMATCH":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  }
}
