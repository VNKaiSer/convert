'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, RefreshCw, Trash2, Upload } from 'lucide-react'
import {
  convertJsonlToJsonString,
  txtFilenameToJson,
} from '@/lib/json-compare/jsonl-converter'
import {
  deleteConvertedFile,
  listConvertedFiles,
  loadConvertedFile,
  saveConvertedFile,
  type ConvertedFileInfo,
} from '@/lib/json-compare/converted-files-client'
import type { Variable } from '@/lib/json-compare/types'

interface JsonlConverterPanelProps {
  variables: Variable[]
  onApplyToVariable: (key: string, value: string) => void
  onError: (message: string) => void
  onSuccess: (message: string) => void
}

export function JsonlConverterPanel({
  variables,
  onApplyToVariable,
  onError,
  onSuccess,
}: JsonlConverterPanelProps) {
  const txtInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<ConvertedFileInfo[]>([])
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [targetKey, setTargetKey] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const targetOptions = useMemo(
    () =>
      Array.from(new Set(variables.map((v) => v.key.trim()).filter(Boolean))),
    [variables],
  )

  const variableKeysSignature = targetOptions.join('\x1f')

  useEffect(() => {
    const keys = variableKeysSignature
      ? variableKeysSignature.split('\x1f')
      : []

    if (keys.length === 0) {
      setTargetKey('')
      return
    }
    setTargetKey((current) =>
      current && keys.includes(current) ? current : keys[0],
    )
  }, [variableKeysSignature])

  const refreshFiles = useCallback(async () => {
    const list = await listConvertedFiles()
    setFiles(list)
    if (list.length === 0) {
      setSelectedFile('')
      return
    }
    setSelectedFile((current) =>
      current && list.some((f) => f.name === current) ? current : list[0].name,
    )
  }, [])

  useEffect(() => {
    refreshFiles()
  }, [refreshFiles])

  const handleConvertTxt = async (file: File) => {
    setIsLoading(true)
    try {
      console.log('convertTxt', file)
      const raw = await file.text()
      const jsonContent = convertJsonlToJsonString(raw, true)
      const outputName = txtFilenameToJson(file.name)

      const saved = await saveConvertedFile(outputName, jsonContent)
      await refreshFiles()
      setSelectedFile(saved.name)

      const diskNote = saved.savedToDisk
        ? ' · saved to converted/ on disk'
        : saved.diskError
          ? ` · disk save skipped: ${saved.diskError}`
          : ''
      onSuccess(
        `Converted ${file.name} → converted/${saved.name} (${saved.recordCount ?? '?'} records)${diskNote}`,
      )
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Convert failed'
      onError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadToVariable = async () => {
    if (!selectedFile) {
      onError('Select a converted JSON file first')
      return
    }
    if (!targetKey.trim()) {
      onError('Add a variable key first, then select it here')
      return
    }

    setIsLoading(true)
    try {
      const content = await loadConvertedFile(selectedFile)
      const parsed = JSON.parse(content)
      const compact = JSON.stringify(parsed)
      onApplyToVariable(targetKey.trim(), compact)
      onSuccess(
        `Loaded converted/${selectedFile} into "${targetKey}" (${compact.length.toLocaleString()} chars)`,
      )
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Load failed'
      onError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteConverted = async () => {
    if (!selectedFile) {
      onError('Select a converted JSON file to delete')
      return
    }

    setIsLoading(true)
    try {
      await deleteConvertedFile(selectedFile)
      await refreshFiles()
      onSuccess(`Deleted converted/${selectedFile}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Delete failed'
      onError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className='dark:bg-gray-800 dark:border-gray-700'>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between gap-3 flex-wrap'>
          <CardTitle className='text-base flex items-center gap-2'>
            <FileText className='h-4 w-4' /> TXT → JSON Converter
          </CardTitle>
          <div className='flex items-center gap-2'>
            <input
              ref={txtInputRef}
              type='file'
              accept='.txt,text/plain'
              className='hidden'
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleConvertTxt(file)
                e.target.value = ''
              }}
            />
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={isLoading}
              onClick={() => txtInputRef.current?.click()}
            >
              <Upload className='h-4 w-4 mr-1' /> Upload TXT
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={isLoading}
              onClick={refreshFiles}
            >
              <RefreshCw className='h-4 w-4 mr-1' /> Refresh
            </Button>
          </div>
        </div>
        <p className='text-xs text-muted-foreground'>
          Mỗi dòng TXT là 1 JSON object. Convert xong lưu IndexedDB (browser) và{' '}
          <code className='font-mono'>converted/</code> trên source (khi chạy{' '}
          <code className='font-mono'>next dev</code>). Chọn biến bên dưới rồi
          Load.
        </p>
      </CardHeader>

      <CardContent className='space-y-3'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
          <div className='space-y-1'>
            <Label>Converted file</Label>
            <Select
              value={selectedFile || undefined}
              onValueChange={setSelectedFile}
            >
              <SelectTrigger className='dark:bg-gray-700 dark:border-gray-600'>
                <SelectValue placeholder='No converted files' />
              </SelectTrigger>
              <SelectContent>
                {files.length === 0 ? (
                  <SelectItem value='__empty' disabled>
                    No converted files yet
                  </SelectItem>
                ) : (
                  files.map((file) => (
                    <SelectItem key={file.name} value={file.name}>
                      {file.name}
                      {file.recordCount !== undefined
                        ? ` (${file.recordCount} records)`
                        : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-1'>
            <Label>Load to variable</Label>
            <Select
              value={targetKey || undefined}
              onValueChange={setTargetKey}
              disabled={targetOptions.length === 0}
            >
              <SelectTrigger className='dark:bg-gray-700 dark:border-gray-600'>
                <SelectValue placeholder='Add variable below first' />
              </SelectTrigger>
              <SelectContent>
                {targetOptions.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            size='sm'
            disabled={isLoading || !selectedFile || !targetKey}
            onClick={handleLoadToVariable}
          >
            Load to variable
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={isLoading || !selectedFile}
            onClick={handleDeleteConverted}
            className='text-red-600 hover:text-red-700'
          >
            <Trash2 className='h-4 w-4 mr-1' /> Clear converted file
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
