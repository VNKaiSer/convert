export const CONTENT_KEYS = {
  converterInput: "app:converter:input",
  compareLeft: "app:compare:left",
  compareRight: "app:compare:right",
  jsonCompareManual1: "app:json-compare:manual:json1",
  jsonCompareManual2: "app:json-compare:manual:json2",
} as const

export type ContentKey = (typeof CONTENT_KEYS)[keyof typeof CONTENT_KEYS]

export function loadPersistedContent(key: ContentKey): string {
  if (typeof window === "undefined") return ""

  try {
    return window.sessionStorage.getItem(key) ?? ""
  } catch {
    return ""
  }
}

export function savePersistedContent(key: ContentKey, value: string): void {
  if (typeof window === "undefined") return

  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // ignore quota / private mode errors
  }
}

export function clearPersistedContent(key: ContentKey): void {
  if (typeof window === "undefined") return

  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // ignore
  }
}
