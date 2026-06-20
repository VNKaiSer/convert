import type { Variable } from "./types"
import { normalizeVariableValue } from "./variable-resolver"

const LOOP_VARIABLE_PRIORITY = ["jsArray", "pcbRaw"]

export function findLoopVariable(
  variables: Variable[],
  endpointBody: string
): Variable | null {
  const jsArray = variables.find((v) => v.key.trim() === "jsArray")
  if (jsArray) return jsArray

  for (const name of LOOP_VARIABLE_PRIORITY) {
    const found = variables.find((v) => v.key.trim() === name)
    if (found) return found
  }

  const referenced = [...endpointBody.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1].trim())
  for (const key of referenced) {
    const found = variables.find((v) => v.key.trim() === key)
    if (found) return found
  }

  return null
}

export function parseLoopItems(raw: string): unknown[] | null {
  const trimmed = raw.trim()
  if (!trimmed.startsWith("[")) return null

  const parsed = JSON.parse(trimmed)
  if (!Array.isArray(parsed)) {
    throw new Error("Loop input must be a JSON array")
  }

  return parsed
}

export function serializeItemForVariable(item: unknown): string {
  if (typeof item === "string") return normalizeVariableValue(item)
  return JSON.stringify(item)
}

export function variablesWithLoopItem(
  variables: Variable[],
  loopKey: string,
  item: unknown
): Variable[] {
  const itemValue = serializeItemForVariable(item)

  return variables.map((v) =>
    v.key.trim() === loopKey.trim() ? { ...v, value: itemValue } : v
  )
}

export function variablesWithInjectedItem(
  variables: Variable[],
  injectKey: string,
  item: unknown
): Variable[] {
  const itemValue = serializeItemForVariable(item)
  const key = injectKey.trim()
  const exists = variables.some((v) => v.key.trim() === key)

  if (exists) {
    return variables.map((v) =>
      v.key.trim() === key ? { ...v, value: itemValue } : v
    )
  }

  return [...variables, { key, value: itemValue }]
}

export function getArrayVariables(variables: Variable[]): Variable[] {
  return variables.filter((variable) => {
    const trimmed = variable.value.trim()
    if (!trimmed.startsWith("[")) return false
    try {
      return Array.isArray(JSON.parse(trimmed))
    } catch {
      return false
    }
  })
}

export function inferInjectKeyFromArrayKey(arrayKey: string): string {
  const trimmed = arrayKey.trim()
  if (trimmed.endsWith("s") && trimmed.length > 1) {
    return trimmed.slice(0, -1)
  }
  return trimmed
}

function pickInjectKey(
  sourceKey: string,
  currentInject: string,
  bodyFieldOptions: string[]
): string {
  const trimmed = currentInject.trim()
  if (trimmed) return trimmed
  const inferred = inferInjectKeyFromArrayKey(sourceKey)
  if (bodyFieldOptions.includes(inferred)) return inferred
  return inferred
}

export function resolveArrayCompareDefaults(
  variables: Variable[],
  bodyFieldOptions: string[],
  current: { mappings: Array<{ sourceVariable: string; injectVariable: string }> }
): { mappings: Array<{ sourceVariable: string; injectVariable: string }> } {
  const arrays = getArrayVariables(variables)
  const rows =
    current.mappings.length > 0
      ? current.mappings.map((m) => ({ ...m }))
      : [{ sourceVariable: "", injectVariable: "" }]

  const mappings = rows.map((row, index) => {
    const curSource = row.sourceVariable.trim()
    const sourceVariable =
      curSource && arrays.some((v) => v.key.trim() === curSource)
        ? curSource
        : (arrays[index]?.key.trim() ?? "")

    return {
      sourceVariable,
      injectVariable: pickInjectKey(sourceVariable, row.injectVariable, bodyFieldOptions),
    }
  })

  return { mappings }
}

export function arrayCompareMappingsEqual(
  a: { mappings: Array<{ sourceVariable: string; injectVariable: string }> },
  b: { mappings: Array<{ sourceVariable: string; injectVariable: string }> }
): boolean {
  if (a.mappings.length !== b.mappings.length) return false
  return a.mappings.every(
    (m, i) =>
      m.sourceVariable === b.mappings[i].sourceVariable &&
      m.injectVariable === b.mappings[i].injectVariable
  )
}

export function variablesWithInjectedItems(
  variables: Variable[],
  injections: Array<{ key: string; item: unknown }>
): Variable[] {
  return injections.reduce(
    (vars, { key, item }) => variablesWithInjectedItem(vars, key, item),
    variables
  )
}

