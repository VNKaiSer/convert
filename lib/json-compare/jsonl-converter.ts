export function convertJsonlToArray(raw: string): unknown[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Invalid JSON'
        throw new Error(`Line ${index + 1}: ${message}`)
      }
    })
    .filter((item) => {
      return !item?.MGResponse?.RI_Req_Output?.Error
    })
}

export function convertJsonlToJsonString(raw: string, pretty = true): string {
  const data = convertJsonlToArray(raw)
  return JSON.stringify(data, null, pretty ? 2 : 0)
}

export function txtFilenameToJson(filename: string): string {
  const base = filename.replace(/\.[^/.]+$/, '').trim() || 'output'
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${safe}.json`
}
