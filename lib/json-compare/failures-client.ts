import type { ApiBatchFailure } from "./types"

const FAILURES_KEY = "json-compare:batch-failures"

interface StoredFailures {
  savedAt: string
  count: number
  failures: ApiBatchFailure[]
}

export async function saveBatchFailures(failures: ApiBatchFailure[]): Promise<string | null> {
  if (failures.length === 0) return null
  if (typeof window === "undefined") return null

  const payload: StoredFailures = {
    savedAt: new Date().toISOString(),
    count: failures.length,
    failures,
  }

  window.localStorage.setItem(FAILURES_KEY, JSON.stringify(payload))
  return "localStorage:batch-failures"
}

export async function loadBatchFailures(): Promise<ApiBatchFailure[]> {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(FAILURES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredFailures | ApiBatchFailure[]
    if (Array.isArray(parsed)) return parsed
    return Array.isArray(parsed.failures) ? parsed.failures : []
  } catch {
    return []
  }
}
