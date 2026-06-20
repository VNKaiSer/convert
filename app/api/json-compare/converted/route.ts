import { NextResponse } from "next/server"
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "fs/promises"
import path from "path"

const CONVERTED_DIR = path.join(process.cwd(), "converted")

function safeFilename(name: string): string {
  const base = path.basename(name)
  if (!base.endsWith(".json")) {
    throw new Error("Filename must end with .json")
  }
  if (!/^[a-zA-Z0-9._-]+\.json$/.test(base)) {
    throw new Error("Invalid filename")
  }
  return base
}

function getFilePath(filename: string): string {
  return path.join(CONVERTED_DIR, safeFilename(filename))
}

async function getFileInfo(filename: string) {
  const filePath = getFilePath(filename)
  const content = await readFile(filePath, "utf-8")
  const fileStat = await stat(filePath)
  let recordCount: number | undefined

  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) recordCount = parsed.length
  } catch {
    // ignore
  }

  return {
    name: filename,
    path: `converted/${filename}`,
    sizeBytes: fileStat.size,
    recordCount,
    updatedAt: fileStat.mtime.toISOString(),
  }
}

export async function GET(request: Request) {
  try {
    await mkdir(CONVERTED_DIR, { recursive: true })
    const { searchParams } = new URL(request.url)
    const file = searchParams.get("file")

    if (file) {
      const content = await readFile(getFilePath(file), "utf-8")
      const info = await getFileInfo(safeFilename(file))
      return NextResponse.json({ file: info, content })
    }

    const entries = await readdir(CONVERTED_DIR)
    const jsonFiles = entries.filter((name) => name.endsWith(".json"))
    const files = await Promise.all(jsonFiles.map((name) => getFileInfo(name)))

    files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return NextResponse.json({ files })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to read converted files"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { filename, content } = await request.json()

    if (typeof filename !== "string" || typeof content !== "string") {
      return NextResponse.json({ error: "filename and content are required" }, { status: 400 })
    }

    JSON.parse(content)

    await mkdir(CONVERTED_DIR, { recursive: true })
    const safeName = safeFilename(filename)
    await writeFile(getFilePath(safeName), content, "utf-8")

    const file = await getFileInfo(safeName)
    return NextResponse.json({ ok: true, file })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save converted file"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const file = searchParams.get("file")

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 })
    }

    await unlink(getFilePath(file))
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete converted file"
    return NextResponse.json({ error: message }, { status: 404 })
  }
}
