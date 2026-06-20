function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function parseJsonPath(path: string): Array<string | number> {
  const normalized = path.replace(/^\$\.?/, "")
  if (!normalized) return []

  const segments: Array<string | number> = []

  for (const part of normalized.split(".")) {
    if (!part) continue

    const bracketMatches = [...part.matchAll(/\[(\d+)\]/g)]
    const keyPart = part.replace(/\[(\d+)\]/g, "")

    if (keyPart) {
      const unquoted = keyPart.replace(/^"|"$/g, "")
      if (unquoted.startsWith("[") && unquoted.endsWith("]")) {
        try {
          segments.push(JSON.parse(unquoted))
        } catch {
          segments.push(unquoted.slice(1, -1))
        }
      } else if (unquoted) {
        segments.push(unquoted)
      }
    }

    for (const match of bracketMatches) {
      segments.push(parseInt(match[1], 10))
    }
  }

  return segments
}

function countBrackets(line: string): { open: number; close: number } {
  let open = 0
  let close = 0
  let inString = false
  let escaped = false

  for (const char of line) {
    if (escaped) {
      escaped = false
      continue
    }
    if (char === "\\") {
      escaped = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (char === "{" || char === "[") open++
    if (char === "}" || char === "]") close++
  }

  return { open, close }
}

function findKeyLine(lines: string[], key: string, from: number, to: number): number {
  const pattern = new RegExp(`"${escapeRegex(key)}"\\s*:`)

  for (let i = from; i <= to; i++) {
    if (pattern.test(lines[i])) return i
  }

  return -1
}

function isStandaloneContainerLine(trimmed: string): boolean {
  return (
    trimmed === "{" ||
    trimmed === "[" ||
    trimmed === "{," ||
    trimmed === "[," ||
    trimmed === "}," ||
    trimmed === "],"
  )
}

function findBracketRange(lines: string[], startLine: number, initialDepth: number): { from: number; to: number } {
  let depth = initialDepth

  for (let i = startLine + 1; i < lines.length; i++) {
    const { open, close } = countBrackets(lines[i])
    depth += open - close
    if (depth <= 0) return { from: startLine, to: i }
  }

  return { from: startLine, to: lines.length - 1 }
}

function findContainerRange(lines: string[], keyLine: number): { from: number; to: number } {
  const line = lines[keyLine]
  const trimmed = line.trim()
  const colonIdx = line.indexOf(":")
  const afterColon = colonIdx >= 0 ? line.slice(colonIdx + 1) : ""

  // Array/object element opens on its own line: `{` or `[` without a key
  if (colonIdx < 0 && isStandaloneContainerLine(trimmed)) {
    return findBracketRange(lines, keyLine, 1)
  }

  const bracketsOnKeyLine = countBrackets(afterColon)
  let depth = bracketsOnKeyLine.open - bracketsOnKeyLine.close
  let start = keyLine

  if (depth <= 0) {
    for (let i = keyLine + 1; i < lines.length; i++) {
      const nextTrimmed = lines[i].trim()
      if (isStandaloneContainerLine(nextTrimmed)) {
        start = i
        return findBracketRange(lines, start, 1)
      }
      if (nextTrimmed && nextTrimmed !== ",") break
    }
  }

  if (depth <= 0) {
    return { from: keyLine, to: keyLine }
  }

  const scanFrom = bracketsOnKeyLine.open > 0 ? keyLine : start + 1

  for (let i = scanFrom; i < lines.length; i++) {
    if (i === keyLine && bracketsOnKeyLine.open > 0) {
      if (depth <= 0) return { from: keyLine, to: i }
      continue
    }

    const { open, close } = countBrackets(lines[i])
    depth += open - close
    if (depth <= 0) return { from: keyLine, to: i }
  }

  return { from: keyLine, to: lines.length - 1 }
}

function findArrayElementStart(lines: string[], index: number, from: number, to: number): number {
  let depth = 0
  let elementIndex = -1

  for (let i = from; i <= to; i++) {
    const trimmed = lines[i].trim()
    const { open, close } = countBrackets(lines[i])

    if (depth === 0) {
      if (trimmed === "{" || trimmed === "{," || (trimmed.startsWith("{") && !trimmed.startsWith("},"))) {
        elementIndex++
        if (elementIndex === index) return i
        depth += open - close
        continue
      }

      if (
        trimmed &&
        trimmed !== "[" &&
        trimmed !== "]," &&
        trimmed !== "]" &&
        !trimmed.startsWith("//")
      ) {
        elementIndex++
        if (elementIndex === index) return i
      }
    }

    depth += open - close
    if (depth < 0) depth = 0
  }

  return -1
}

function normalizePathForJson(jsonText: string, path: string): string {
  if (!jsonText.trim()) return path

  try {
    const parsed = JSON.parse(jsonText)
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return path

    const hasDataKey = Object.prototype.hasOwnProperty.call(parsed, "data")
    const pathHasData = path.startsWith("$.data") || path.startsWith("$['data']")

    if (!hasDataKey && pathHasData) {
      return path.replace(/^\$\.data\.?/, "$.").replace(/^\$\.data$/, "$")
    }
  } catch {
    // keep original path
  }

  return path
}

export function findLineForPath(jsonText: string, path: string): number {
  if (!jsonText.trim() || !path) return 1

  const normalizedPath = normalizePathForJson(jsonText, path)
  const segments = parseJsonPath(normalizedPath)
  if (segments.length === 0) return 1

  const lines = jsonText.split("\n")
  let searchFrom = 0
  let searchTo = lines.length - 1

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const isLast = i === segments.length - 1

    if (typeof segment === "string") {
      const lineIdx = findKeyLine(lines, segment, searchFrom, searchTo)
      if (lineIdx === -1) return 1

      if (isLast) return lineIdx + 1

      const range = findContainerRange(lines, lineIdx)
      searchFrom = range.from
      searchTo = range.to
      continue
    }

    for (let j = searchFrom; j <= searchTo; j++) {
      const bracketIdx = lines[j].indexOf("[")
      if (bracketIdx === -1) continue

      const afterBracket = lines[j].slice(bracketIdx + 1).trim()
      const hasInlineElement =
        afterBracket.length > 0 && afterBracket !== "]" && !afterBracket.startsWith("]")

      searchFrom = hasInlineElement ? j : j + 1
      break
    }

    const elementLine = findArrayElementStart(lines, segment, searchFrom, searchTo)
    if (elementLine === -1) return 1

    if (isLast) return elementLine + 1

    const trimmed = lines[elementLine].trim()
    if (trimmed === "{" || trimmed.startsWith("{")) {
      const range = findContainerRange(lines, elementLine)
      searchFrom = range.from
      searchTo = range.to
    } else {
      searchFrom = elementLine
      searchTo = elementLine
    }
  }

  return 1
}

export function findLinesForPath(jsonText: string, path: string): number[] {
  const line = findLineForPath(jsonText, path)
  return line > 0 ? [line] : [1]
}
