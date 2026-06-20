export function extractDataObject(body: string): string {
  if (!body.trim()) return body

  try {
    const parsed = JSON.parse(body)

    if (
      parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      Object.prototype.hasOwnProperty.call(parsed, "data")
    ) {
      return JSON.stringify(parsed.data, null, 2)
    }

    return JSON.stringify(parsed, null, 2)
  } catch {
    return body
  }
}
