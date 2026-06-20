const tempResponses = new Map<1 | 2, string>()

export function saveTempResponse(slot: 1 | 2, content: string): void {
  tempResponses.set(slot, content)
}

export function loadTempResponse(slot: 1 | 2): string | undefined {
  return tempResponses.get(slot)
}

export function clearTempResponses(): void {
  tempResponses.clear()
}
