export const REQUEST_TIMEOUT_MS = 30_000

export interface HttpCallResult {
  ok: boolean
  status: number
  durationMs: number
  sizeBytes: number
  body: string
  error?: string
}

export function formatHttpError(status: number, body: string): string {
  const trimmed = body.trim()
  if (!trimmed) return `HTTP ${status}`

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    const message =
      parsed.message ?? parsed.error ?? parsed.detail ?? parsed.title ?? parsed.statusMessage
    if (message !== undefined && message !== null && String(message).trim()) {
      return `HTTP ${status}: ${String(message).trim()}`
    }
  } catch {
    // use raw snippet below
  }

  const snippet = trimmed.length > 280 ? `${trimmed.slice(0, 280)}…` : trimmed
  return `HTTP ${status}: ${snippet}`
}

export async function callHttp(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string
): Promise<HttpCallResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const start = Date.now()

  try {
    const response = await fetch(url, {
      method: method ?? "GET",
      headers: headers ?? {},
      body: body ?? undefined,
      signal: controller.signal,
    })

    const responseBody = await response.text()
    const durationMs = Date.now() - start

    let formattedBody = responseBody
    try {
      formattedBody = JSON.stringify(JSON.parse(responseBody), null, 2)
    } catch {
      // keep raw body for non-JSON responses
    }

    const error = response.ok ? undefined : formatHttpError(response.status, responseBody)

    return {
      ok: response.ok,
      status: response.status,
      durationMs,
      sizeBytes: new TextEncoder().encode(responseBody).length,
      body: formattedBody,
      error,
    }
  } catch (error: unknown) {
    const durationMs = Date.now() - start
    const message =
      error instanceof Error
        ? error.name === "AbortError"
          ? `Request timeout after ${REQUEST_TIMEOUT_MS}ms`
          : error.message
        : "Request failed"

    return {
      ok: false,
      status: 0,
      durationMs,
      sizeBytes: 0,
      body: "",
      error: message,
    }
  } finally {
    clearTimeout(timeout)
  }
}
