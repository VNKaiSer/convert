import {
  DEFAULT_ARRAY_COMPARE_CONFIG,
  DEFAULT_JSON_COMPARE_SETTINGS,
  type ArrayCompareConfig,
  type JsonCompareSettings,
} from "./types"

const SETTINGS_KEY = "json-compare:settings"

function normalizeArrayCompare(raw: unknown): ArrayCompareConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_ARRAY_COMPARE_CONFIG

  const obj = raw as Record<string, unknown>

  if (Array.isArray(obj.mappings)) {
    const mappings = obj.mappings
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        sourceVariable: String(
          (item as { sourceVariable?: unknown }).sourceVariable ?? ""
        ),
        injectVariable: String(
          (item as { injectVariable?: unknown }).injectVariable ?? ""
        ),
      }))

    if (mappings.length > 0) return { mappings }
  }

  const mappings: ArrayCompareConfig["mappings"] = []
  const sourceVariable = String(obj.sourceVariable ?? "")
  const injectVariable = String(obj.injectVariable ?? "")
  if (sourceVariable || injectVariable) {
    mappings.push({ sourceVariable, injectVariable })
  }

  const secondarySourceVariable = String(obj.secondarySourceVariable ?? "")
  const secondaryInjectVariable = String(obj.secondaryInjectVariable ?? "")
  if (secondarySourceVariable || secondaryInjectVariable) {
    mappings.push({
      sourceVariable: secondarySourceVariable,
      injectVariable: secondaryInjectVariable,
    })
  }

  return mappings.length > 0
    ? { mappings }
    : DEFAULT_ARRAY_COMPARE_CONFIG
}

function normalizeSettings(data: unknown): JsonCompareSettings {
  if (!data || typeof data !== "object") return DEFAULT_JSON_COMPARE_SETTINGS

  const raw = data as Partial<JsonCompareSettings>

  return {
    variables: Array.isArray(raw.variables)
      ? raw.variables
          .filter((item) => item && typeof item === "object")
          .map((item) => ({
            key: String((item as { key?: unknown }).key ?? ""),
            value: String((item as { value?: unknown }).value ?? ""),
          }))
      : [],
    endpoint1: {
      ...DEFAULT_JSON_COMPARE_SETTINGS.endpoint1,
      ...(raw.endpoint1 ?? {}),
    },
    endpoint2: {
      ...DEFAULT_JSON_COMPARE_SETTINGS.endpoint2,
      ...(raw.endpoint2 ?? {}),
    },
    arrayCompare: normalizeArrayCompare(raw.arrayCompare),
  }
}

export async function loadJsonCompareSettings(): Promise<JsonCompareSettings> {
  if (typeof window === "undefined") return DEFAULT_JSON_COMPARE_SETTINGS

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_JSON_COMPARE_SETTINGS
    return normalizeSettings(JSON.parse(raw))
  } catch {
    return DEFAULT_JSON_COMPARE_SETTINGS
  }
}

export async function saveJsonCompareSettings(settings: JsonCompareSettings): Promise<void> {
  if (typeof window === "undefined") return

  const normalized = normalizeSettings(settings)
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized))
}
