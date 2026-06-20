import {
  deleteStoredConvertedFile,
  listStoredConvertedFiles,
  loadStoredConvertedFile,
  saveStoredConvertedFile,
  type ConvertedFileInfo,
} from "./converted-storage"
import {
  deleteConvertedFileFromDisk,
  saveConvertedFileToDisk,
} from "./converted-disk-client"

export type { ConvertedFileInfo }

export interface SaveConvertedFileResult extends ConvertedFileInfo {
  savedToDisk: boolean
  diskError?: string
}

export async function listConvertedFiles(): Promise<ConvertedFileInfo[]> {
  try {
    return await listStoredConvertedFiles()
  } catch {
    return []
  }
}

export async function saveConvertedFile(
  filename: string,
  content: string
): Promise<SaveConvertedFileResult> {
  const saved = await saveStoredConvertedFile(filename, content)

  try {
    await saveConvertedFileToDisk(filename, content)
    return { ...saved, savedToDisk: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Disk save failed"
    return { ...saved, savedToDisk: false, diskError: message }
  }
}

export async function loadConvertedFile(filename: string): Promise<string> {
  return loadStoredConvertedFile(filename)
}

export async function deleteConvertedFile(filename: string): Promise<void> {
  await deleteStoredConvertedFile(filename)

  try {
    await deleteConvertedFileFromDisk(filename)
  } catch {
    // File may not exist on disk; IndexedDB delete is enough for UI.
  }
}
