import type { ApiBatchFailure, ApiCallResult } from "./types"

const BODY_SNIPPET_MAX = 1500

export function truncateResponseBody(body: string | undefined, max = BODY_SNIPPET_MAX): string | undefined {
  if (!body?.trim()) return undefined
  const trimmed = body.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max)}\n… (truncated)`
}

export function collectBatchFailures(
  batchResults: ApiCallResult[],
  batchIndex: number,
  failures: ApiBatchFailure[]
): boolean {
  const label = batchResults[0]?.loopVariable ?? `Batch ${batchIndex + 1}`
  let hasFailure = false

  for (const result of batchResults) {
    if (result.ok) continue
    hasFailure = true
    failures.push({
      batchIndex,
      batchNumber: batchIndex + 1,
      label,
      slot: result.slot,
      status: result.status,
      error: result.error ?? "Unknown error",
      durationMs: result.durationMs,
      responseBody: truncateResponseBody(result.body),
    })
  }

  return hasFailure
}

export function failuresToSampleErrors(failures: ApiBatchFailure[], limit = 8): string[] {
  return failures.slice(0, limit).map(
    (f) => `Batch ${f.batchNumber} (${f.label}) EP${f.slot}: ${f.error}`
  )
}
