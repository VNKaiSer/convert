import type {
  ApiBatchFailure,
  ApiBatchProgress,
  ApiBatchRunResult,
  ApiBatchStats,
  ApiCallResult,
  ArrayCompareConfig,
  EndpointConfig,
  Variable,
} from "./types"
import {
  findLoopVariable,
  parseLoopItems,
  variablesWithInjectedItem,
  variablesWithInjectedItems,
  variablesWithLoopItem,
} from "./array-batch"
import { createProgressReporter } from "./batch-progress"
import { collectBatchFailures, failuresToSampleErrors } from "./failure-utils"
import { saveBatchFailures } from "./failures-client"
import { callHttp } from "./http-call"
import { saveTempResponse } from "./temp-storage"
import { TEMP_FILE_NAMES } from "./constants"
import { parseHeadersJson, resolveBodyVariables, resolveVariables } from "./variable-resolver"
import { extractDataObject } from "./response-extractor"

export interface CallEndpointPayload {
  slot: 1 | 2
  config: EndpointConfig
  variables: Variable[]
  skipTempSave?: boolean
}

export interface BatchRunOptions {
  onProgress?: (progress: ApiBatchProgress) => void
}

export async function callEndpoint(payload: CallEndpointPayload): Promise<ApiCallResult> {
  const { slot, config, variables, skipTempSave = false } = payload
  const resolvedUrl = resolveVariables(config.url.trim(), variables)
  const resolvedBody = resolveBodyVariables(config.body, variables)

  if (!resolvedUrl) {
    return {
      slot,
      ok: false,
      status: 0,
      durationMs: 0,
      sizeBytes: 0,
      error: "URL is required",
      tempFile: TEMP_FILE_NAMES[slot],
    }
  }

  let headers: Record<string, string> = {}
  try {
    headers = parseHeadersJson(config.headers, variables)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid headers"
    return {
      slot,
      ok: false,
      status: 0,
      durationMs: 0,
      sizeBytes: 0,
      error: message,
      tempFile: TEMP_FILE_NAMES[slot],
    }
  }

  const data = await callHttp(
    config.method,
    resolvedUrl,
    headers,
    ["POST", "PUT", "PATCH"].includes(config.method) ? resolvedBody : undefined
  )

  const extractedBody = data.body ? extractDataObject(data.body) : ""

  if (extractedBody && !skipTempSave) {
    saveTempResponse(slot, extractedBody)
  }

  return {
    slot,
    ok: data.ok,
    status: data.status,
    durationMs: data.durationMs,
    sizeBytes: new TextEncoder().encode(extractedBody).length,
    body: extractedBody,
    error: data.error,
    tempFile: TEMP_FILE_NAMES[slot],
  }
}

function toLightweightResult(
  result: ApiCallResult,
  batchIndex?: number,
  loopVariable?: string
): ApiCallResult {
  return {
    slot: result.slot,
    batchIndex,
    loopVariable,
    ok: result.ok,
    status: result.status,
    durationMs: result.durationMs,
    sizeBytes: result.sizeBytes,
    error: result.error,
    tempFile: result.tempFile,
  }
}

export async function callBothEndpoints(
  endpoint1: EndpointConfig,
  endpoint2: EndpointConfig,
  variables: Variable[],
  batchIndex?: number,
  loopVariable?: string,
  options?: { skipTempSave?: boolean }
): Promise<ApiCallResult[]> {
  const skipTempSave = options?.skipTempSave ?? false
  const [result1, result2] = await Promise.all([
    callEndpoint({ slot: 1, config: endpoint1, variables, skipTempSave }),
    callEndpoint({ slot: 2, config: endpoint2, variables, skipTempSave }),
  ])

  return [
    { ...result1, batchIndex, loopVariable },
    { ...result2, batchIndex, loopVariable },
  ]
}

function parseResponseBody(body: string): unknown {
  if (!body.trim()) return null
  try {
    return JSON.parse(body)
  } catch {
    return body
  }
}

function combineResponseBodies(bodies: string[]): string {
  const items: unknown[] = []
  for (const body of bodies) {
    const parsed = parseResponseBody(body)
    if (parsed !== null && parsed !== "") items.push(parsed)
  }

  if (items.length === 0) return ""

  if (items.length === 1) {
    return JSON.stringify(items[0], null, 2)
  }
  return JSON.stringify(items, null, 2)
}

async function runBatchLoop(
  endpoint1: EndpointConfig,
  endpoint2: EndpointConfig,
  total: number,
  runBatch: (index: number) => Promise<ApiCallResult[]>,
  options?: BatchRunOptions
): Promise<{
  responses: ApiCallResult[]
  bodies1: string[]
  bodies2: string[]
  stats: ApiBatchStats
}> {
  const progress = createProgressReporter(total, options?.onProgress)
  const responses: ApiCallResult[] = []
  const bodies1: string[] = []
  const bodies2: string[] = []
  const failures: ApiBatchFailure[] = []
  let successBatches = 0
  let failedBatches = 0

  for (let i = 0; i < total; i++) {
    const batchResults = await runBatch(i)

    const batchFailed = collectBatchFailures(batchResults, i, failures)
    if (batchFailed) failedBatches++
    else successBatches++

    const ep1 = batchResults[0]
    const ep2 = batchResults[1]
    if (ep1?.ok && ep2?.ok) {
      const b1 = ep1.body ?? ""
      const b2 = ep2.body ?? ""
      if (b1.trim()) bodies1.push(b1)
      if (b2.trim()) bodies2.push(b2)
    }

    for (const result of batchResults) {
      responses.push(
        toLightweightResult(result, result.batchIndex, result.loopVariable)
      )
    }

    progress.tick(batchFailed)
  }

  progress.finish()

  let failureFile: string | undefined
  if (failures.length > 0) {
    try {
      failureFile = (await saveBatchFailures(failures)) ?? undefined
    } catch {
      // best-effort
    }
  }

  return {
    responses,
    bodies1,
    bodies2,
    stats: {
      totalBatches: total,
      successBatches,
      failedBatches,
      failures,
      failureFile,
      sampleErrors: failuresToSampleErrors(failures),
    },
  }
}

export async function callBothEndpointsWithBatch(
  endpoint1: EndpointConfig,
  endpoint2: EndpointConfig,
  variables: Variable[],
  options?: BatchRunOptions
): Promise<ApiBatchRunResult> {
  const loopVariable = findLoopVariable(variables, endpoint1.body)
  const loopKey = loopVariable?.key?.trim()

  if (!loopVariable || !loopKey) {
    const responses = await callBothEndpoints(endpoint1, endpoint2, variables)
    const body1 = responses[0]?.body ?? ""
    const body2 = responses[1]?.body ?? ""
    return {
      mode: "single",
      batchCount: 1,
      responses,
      combinedJson1: body1,
      combinedJson2: body2,
    }
  }

  let items: unknown[] | null = null
  try {
    items = parseLoopItems(loopVariable.value)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid loop array"
    throw new Error(`${loopKey}: ${message}`)
  }

  if (!items) {
    const responses = await callBothEndpoints(endpoint1, endpoint2, variables, 0, loopKey)
    const body1 = responses[0]?.body ?? ""
    const body2 = responses[1]?.body ?? ""
    return {
      mode: "single",
      loopVariable: loopKey,
      batchCount: 1,
      responses,
      combinedJson1: body1,
      combinedJson2: body2,
    }
  }

  if (items.length === 0) {
    throw new Error(`${loopKey} array is empty`)
  }

  const { responses, bodies1, bodies2, stats } = await runBatchLoop(
    endpoint1,
    endpoint2,
    items.length,
    async (i) => {
      const batchVariables = variablesWithLoopItem(variables, loopKey, items![i])
      return callBothEndpoints(endpoint1, endpoint2, batchVariables, i, loopKey, {
        skipTempSave: true,
      })
    },
    options
  )

  return {
    mode: "array",
    loopVariable: loopKey,
    batchCount: items.length,
    responses,
    combinedJson1: combineResponseBodies(bodies1),
    combinedJson2: combineResponseBodies(bodies2),
    stats,
  }
}

interface ArrayInjectionMapping {
  sourceKey: string
  injectKey: string
  items: unknown[]
}

function loadArrayMapping(
  variables: Variable[],
  sourceVariable: string,
  injectVariable: string
): ArrayInjectionMapping {
  const sourceKey = sourceVariable.trim()
  const injectKey = injectVariable.trim()

  if (!sourceKey) throw new Error("Source array variable is required")
  if (!injectKey) throw new Error("Body field variable is required")

  const source = variables.find((v) => v.key.trim() === sourceKey)
  if (!source) throw new Error(`Variable "${sourceKey}" not found`)

  let items: unknown[]
  try {
    const parsed = parseLoopItems(source.value)
    if (!parsed) throw new Error(`${sourceKey} must be a JSON array`)
    items = parsed
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid array variable"
    throw new Error(`${sourceKey}: ${message}`)
  }

  if (items.length === 0) throw new Error(`${sourceKey} array is empty`)

  return { sourceKey, injectKey, items }
}

export async function callBothEndpointsWithArrayMapping(
  endpoint1: EndpointConfig,
  endpoint2: EndpointConfig,
  variables: Variable[],
  config: ArrayCompareConfig,
  options?: BatchRunOptions
): Promise<ApiBatchRunResult> {
  const configured = config.mappings.filter(
    (m) => m.sourceVariable.trim() && m.injectVariable.trim()
  )

  if (configured.length === 0) {
    throw new Error("At least one array → body field mapping is required")
  }

  for (const row of config.mappings) {
    const hasSource = row.sourceVariable.trim() !== ""
    const hasInject = row.injectVariable.trim() !== ""
    if (hasSource !== hasInject) {
      throw new Error("Each mapping row needs both array and body field")
    }
  }

  const mappings = configured.map((m) =>
    loadArrayMapping(variables, m.sourceVariable, m.injectVariable)
  )

  const primary = mappings[0]
  const loopLabel = mappings.map((m) => `${m.sourceKey}→${m.injectKey}`).join(" + ")

  const { responses, bodies1, bodies2, stats } = await runBatchLoop(
    endpoint1,
    endpoint2,
    primary.items.length,
    async (i) => {
      const injections: Array<{ key: string; item: unknown }> = []
      const batchLabelParts: string[] = []

      for (const mapping of mappings) {
        if (i >= mapping.items.length) continue
        injections.push({ key: mapping.injectKey, item: mapping.items[i] })
        batchLabelParts.push(`${mapping.sourceKey}[${i}]→${mapping.injectKey}`)
      }

      const batchVariables = variablesWithInjectedItems(variables, injections)
      const batchLabel = batchLabelParts.join(" + ")
      return callBothEndpoints(
        endpoint1,
        endpoint2,
        batchVariables,
        i,
        batchLabel,
        { skipTempSave: true }
      )
    },
    options
  )

  return {
    mode: "array",
    loopVariable: loopLabel,
    batchCount: primary.items.length,
    responses,
    combinedJson1: combineResponseBodies(bodies1),
    combinedJson2: combineResponseBodies(bodies2),
    stats,
  }
}

export function formatResponseBody(body: string): string {
  return extractDataObject(body)
}
