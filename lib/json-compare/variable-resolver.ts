import type { Variable } from "./types"

const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g

function escapeForJsonString(value: string): string {
  return JSON.stringify(value).slice(1, -1)
}

/** Unwrap JSON string literal: `"hello"` → `hello`, `"{\"a\":1}"` → `{"a":1}` */
export function normalizeVariableValue(value: string): string {
  const trimmed = value.trim()
  if (!trimmed.startsWith('"')) return value

  try {
    const parsed = JSON.parse(trimmed)
    if (typeof parsed === "string") return parsed
  } catch {
    // keep original if not valid JSON string literal
  }

  return value
}

function resolveVariableValue(value: string, asJsonString: boolean): string {
  const normalized = normalizeVariableValue(value)
  return asJsonString ? escapeForJsonString(normalized) : normalized
}

export function resolveVariables(text: string, variables: Variable[]): string {
  const map = new Map(variables.map((v) => [v.key.trim(), v.value]))
  return text.replace(VARIABLE_PATTERN, (_, key: string) => {
    const trimmed = key.trim()
    if (!map.has(trimmed)) return `{{${trimmed}}}`
    return resolveVariableValue(map.get(trimmed)!, false)
  })
}

/** Resolve variables for JSON body/headers — values are always embedded as JSON strings */
export function resolveBodyVariables(text: string, variables: Variable[]): string {
  const map = new Map(variables.map((v) => [v.key.trim(), v.value]))
  return text.replace(VARIABLE_PATTERN, (_, key: string) => {
    const trimmed = key.trim()
    if (!map.has(trimmed)) return `{{${trimmed}}}`
    return resolveVariableValue(map.get(trimmed)!, true)
  })
}

export function parseHeadersJson(headersText: string, variables: Variable[]): Record<string, string> {
  const resolved = resolveBodyVariables(headersText.trim(), variables)
  if (!resolved) return {}

  try {
    const parsed = JSON.parse(resolved)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Headers must be a JSON object")
    }
    return Object.fromEntries(
      Object.entries(parsed).map(([k, v]) => [k, String(v)])
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid headers JSON"
    throw new Error(message)
  }
}

export function parseVariablesFromJson(text: string): Variable[] {
  const parsed = JSON.parse(text)
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Variable file must be a JSON object")
  }
  return Object.entries(parsed).map(([key, value]) => ({
    key,
    value:
      typeof value === "string"
        ? normalizeVariableValue(value)
        : JSON.stringify(value),
  }))
}

export function variablesToJson(variables: Variable[]): string {
  return JSON.stringify(
    Object.fromEntries(variables.map((v) => [v.key, v.value])),
    null,
    2
  )
}

export function hasUnresolvedVariables(text: string, variables: Variable[]): string[] {
  const keys = new Set(variables.map((v) => v.key.trim()))
  const unresolved: string[] = []
  const matches = text.matchAll(VARIABLE_PATTERN)
  for (const match of matches) {
    const key = match[1].trim()
    if (!keys.has(key)) unresolved.push(key)
  }
  return [...new Set(unresolved)]
}
