const API_PATH = "/api/json-compare/converted"

export async function saveConvertedFileToDisk(
  filename: string,
  content: string
): Promise<void> {
  const response = await fetch(API_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, content }),
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error ?? `Failed to save converted/${filename} (${response.status})`)
  }
}

export async function deleteConvertedFileFromDisk(filename: string): Promise<void> {
  const response = await fetch(
    `${API_PATH}?file=${encodeURIComponent(filename)}`,
    { method: "DELETE" }
  )

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error ?? `Failed to delete converted/${filename} (${response.status})`)
  }
}
