import type { CompareOptions, JsonDiffResult } from "@/lib/json-compare"

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface Variable {
  key: string
  value: string
}

export interface EndpointConfig {
  method: HttpMethod
  url: string
  headers: string
  body: string
}

export interface ApiCallResult {
  slot: 1 | 2
  batchIndex?: number
  loopVariable?: string
  ok: boolean
  status: number
  durationMs: number
  sizeBytes: number
  body?: string
  error?: string
  tempFile: string
}

export interface ApiBatchProgress {
  completed: number
  total: number
  failed: number
}

export interface ApiBatchFailure {
  batchIndex: number
  batchNumber: number
  label: string
  slot: 1 | 2
  status: number
  error: string
  durationMs: number
  responseBody?: string
}

export interface ApiBatchStats {
  totalBatches: number
  successBatches: number
  failedBatches: number
  failures: ApiBatchFailure[]
  failureFile?: string
  /** @deprecated use failures */
  sampleErrors: string[]
}

export interface ApiBatchRunResult {
  mode: "single" | "array"
  loopVariable?: string
  batchCount: number
  responses: ApiCallResult[]
  combinedJson1: string
  combinedJson2: string
  stats?: ApiBatchStats
}

export type CompareSummaryType = "ok" | "warn" | "error"

export interface CompareSummary {
  type: CompareSummaryType
  message: string
}

export type DiffSortColumn = "index" | "type" | "path" | "json1" | "json2"
export type SortDirection = "asc" | "desc"

export interface DiffSortState {
  column: DiffSortColumn
  direction: SortDirection
}

export interface DiffGroup {
  groupPath: string
  diffs: JsonDiffResult[]
}

export interface DiffTreeNode {
  label: string
  path: string
  diffs: JsonDiffResult[]
  children: DiffTreeNode[]
}

export interface LineHighlight {
  line: number
  type: JsonDiffResult["type"]
}

export interface JsonCompareState {
  json1: string
  json2: string
  options: CompareOptions
  variables: Variable[]
  endpoint1: EndpointConfig
  endpoint2: EndpointConfig
}

export const DEFAULT_COMPARE_OPTIONS: CompareOptions = {
  numericEqual: true,
  trimString: false,
  missingNullEqual: false,
  stringNumberEqual: false,
  keyIgnoreCase: false,
  sliceEquals: false,
  sliceDecimal: 0,
  ignoreFields: [],
}

export const DEFAULT_ENDPOINT: EndpointConfig = {
  method: "POST",
  url: "",
  headers: '{\n  "Content-Type": "application/json"\n}',
  body: '{\n  "pcbRaw": "{{pcbRaw}}"\n}',
}

export const DEFAULT_SORT: DiffSortState = {
  column: "path",
  direction: "asc",
}

export interface ArrayCompareMapping {
  sourceVariable: string
  injectVariable: string
}

export interface ArrayCompareConfig {
  mappings: ArrayCompareMapping[]
}

export const DEFAULT_ARRAY_COMPARE_MAPPING: ArrayCompareMapping = {
  sourceVariable: "",
  injectVariable: "",
}

export const DEFAULT_ARRAY_COMPARE_CONFIG: ArrayCompareConfig = {
  mappings: [{ ...DEFAULT_ARRAY_COMPARE_MAPPING }],
}

export interface JsonCompareSettings {
  variables: Variable[]
  endpoint1: EndpointConfig
  endpoint2: EndpointConfig
  arrayCompare: ArrayCompareConfig
}

export const DEFAULT_JSON_COMPARE_SETTINGS: JsonCompareSettings = {
  variables: [],
  endpoint1: DEFAULT_ENDPOINT,
  endpoint2: DEFAULT_ENDPOINT,
  arrayCompare: DEFAULT_ARRAY_COMPARE_CONFIG,
}
