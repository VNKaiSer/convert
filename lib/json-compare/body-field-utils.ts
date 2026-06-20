export function extractBodyVariableRefs(text: string): string[] {
  const refs = [...text.matchAll(/\{\{([^}]+)\}\}/g)].map((match) => match[1].trim())
  return Array.from(new Set(refs.filter(Boolean)))
}
