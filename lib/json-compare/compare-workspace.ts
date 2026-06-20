import type { JsonDiffResult } from "@/lib/json-compare"
import type { CompareSummary, DiffSortState } from "./types"
import { DEFAULT_SORT } from "./types"

export type DiffViewMode = "flat" | "tree"

export interface CompareWorkspace {
  json1: string
  json2: string
  filter: string
  diffs: JsonDiffResult[]
  hasCompared: boolean
  summary: CompareSummary | null
  sort: DiffSortState
  viewMode: DiffViewMode
  activeDiffPath: string | null
}

export function createEmptyWorkspace(): CompareWorkspace {
  return {
    json1: "",
    json2: "",
    filter: "",
    diffs: [],
    hasCompared: false,
    summary: null,
    sort: DEFAULT_SORT,
    viewMode: "flat",
    activeDiffPath: null,
  }
}

export function patchWorkspace(
  workspace: CompareWorkspace,
  patch: Partial<CompareWorkspace>
): CompareWorkspace {
  return { ...workspace, ...patch }
}
