export type JsonKeySortDirection = "asc" | "desc"

function compareJsonKeys(a: string, b: string, direction: JsonKeySortDirection): number {
  const order = a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  return direction === "asc" ? order : -order
}

export function sortObjectKeysDeep(
  value: unknown,
  direction: JsonKeySortDirection = "asc"
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectKeysDeep(item, direction))
  }

  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj).sort((a, b) => compareJsonKeys(a, b, direction))
    return Object.fromEntries(
      keys.map((key) => [key, sortObjectKeysDeep(obj[key], direction)])
    )
  }

  return value
}

export function sortJsonText(text: string, direction: JsonKeySortDirection = "asc"): string {
  if (!text.trim()) return text

  try {
    const parsed = JSON.parse(text)
    return JSON.stringify(sortObjectKeysDeep(parsed, direction), null, 2)
  } catch {
    return text
  }
}
