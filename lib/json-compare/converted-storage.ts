export interface ConvertedFileInfo {
  name: string
  path: string
  sizeBytes: number
  recordCount?: number
  updatedAt: string
}

const DB_NAME = "json-compare-converted"
const STORE_NAME = "files"
const DB_VERSION = 1

interface StoredFile {
  content: string
  updatedAt: string
}

function safeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name
  if (!base.endsWith(".json")) {
    throw new Error("Filename must end with .json")
  }
  if (!/^[a-zA-Z0-9._-]+\.json$/.test(base)) {
    throw new Error("Invalid filename")
  }
  return base
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

function toFileInfo(name: string, stored: StoredFile): ConvertedFileInfo {
  let recordCount: number | undefined
  try {
    const parsed = JSON.parse(stored.content)
    if (Array.isArray(parsed)) recordCount = parsed.length
  } catch {
    // ignore
  }

  return {
    name,
    path: `converted/${name}`,
    sizeBytes: new TextEncoder().encode(stored.content).length,
    recordCount,
    updatedAt: stored.updatedAt,
  }
}

export async function listStoredConvertedFiles(): Promise<ConvertedFileInfo[]> {
  const db = await openDb()
  const files: ConvertedFileInfo[] = []

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const request = tx.objectStore(STORE_NAME).openCursor()

    request.onerror = () => reject(request.error ?? new Error("Failed to list files"))
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) {
        resolve()
        return
      }

      files.push(toFileInfo(String(cursor.key), cursor.value as StoredFile))
      cursor.continue()
    }
  })

  files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return files
}

function getStoredFile(db: IDBDatabase, name: string): Promise<StoredFile | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const request = tx.objectStore(STORE_NAME).get(name)

    request.onerror = () => reject(request.error ?? new Error("Failed to read file"))
    request.onsuccess = () => resolve((request.result as StoredFile | undefined) ?? null)
  })
}

export async function saveStoredConvertedFile(
  filename: string,
  content: string
): Promise<ConvertedFileInfo> {
  JSON.parse(content)

  const name = safeFilename(filename)
  const stored: StoredFile = {
    content,
    updatedAt: new Date().toISOString(),
  }

  const db = await openDb()

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const request = tx.objectStore(STORE_NAME).put(stored, name)

    request.onerror = () => reject(request.error ?? new Error("Failed to save file"))
    request.onsuccess = () => resolve()
  })

  return toFileInfo(name, stored)
}

export async function loadStoredConvertedFile(filename: string): Promise<string> {
  const name = safeFilename(filename)
  const db = await openDb()
  const stored = await getStoredFile(db, name)

  if (!stored) {
    throw new Error("Converted file not found")
  }

  return stored.content
}

export async function deleteStoredConvertedFile(filename: string): Promise<void> {
  const name = safeFilename(filename)
  const db = await openDb()

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const request = tx.objectStore(STORE_NAME).delete(name)

    request.onerror = () => reject(request.error ?? new Error("Failed to delete file"))
    request.onsuccess = () => resolve()
  })
}
