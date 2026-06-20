'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload } from 'lucide-react'
import type {
  EndpointConfig,
  HttpMethod,
  Variable,
} from '@/lib/json-compare/types'
import {
  resolveBodyVariables,
  resolveVariables,
} from '@/lib/json-compare/variable-resolver'

interface EndpointConfigPanelProps {
  title: string
  config: EndpointConfig
  variables: Variable[]
  onChange: (config: EndpointConfig) => void
  onError: (message: string) => void
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

export function EndpointConfigPanel({
  title,
  config,
  variables,
  onChange,
  onError,
}: EndpointConfigPanelProps) {
  const bodyFileRef = useRef<HTMLInputElement>(null)
  const resolvedUrl = resolveVariables(config.url, variables)
  const resolvedBody = resolveBodyVariables(config.body, variables)
  const showBody = ['POST', 'PUT', 'PATCH'].includes(config.method)

  const update = <K extends keyof EndpointConfig>(
    key: K,
    value: EndpointConfig[K],
  ) => {
    onChange({ ...config, [key]: value })
  }

  const handleBodyFile = async (file: File) => {
    try {
      const text = await file.text()
      JSON.parse(text)
      update('body', text)
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Invalid JSON file'
      onError(`Failed to load body file: ${message}`)
    }
  }

  return (
    <Card className='dark:bg-gray-800 dark:border-gray-700'>
      <CardHeader className='pb-3'>
        <CardTitle className='text-base'>{title}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        <div className='grid grid-cols-[120px_1fr] gap-2 items-center'>
          <Label>Method</Label>
          <Select
            value={config.method}
            onValueChange={(value) => update('method', value as HttpMethod)}
          >
            <SelectTrigger className='dark:bg-gray-700 dark:border-gray-600'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-1'>
          <Label>URL</Label>
          <Input
            value={config.url}
            onChange={(e) => update('url', e.target.value)}
            placeholder='https://api.example.com/{{env}}'
            className='dark:bg-gray-700 dark:border-gray-600 font-mono text-sm'
          />
          {config.url.includes('{{') && (
            <p className='text-xs text-muted-foreground font-mono truncate'>
              Resolved: {resolvedUrl}
            </p>
          )}
        </div>

        <div className='space-y-1'>
          <Label>Headers (JSON)</Label>
          <Textarea
            value={config.headers}
            onChange={(e) => update('headers', e.target.value)}
            className='min-h-[80px] font-mono text-xs dark:bg-gray-700 dark:border-gray-600'
          />
        </div>

        {showBody && (
          <div className='space-y-1'>
            <div className='flex items-center justify-between'>
              <Label>Body (JSON)</Label>
              <div>
                <input
                  ref={bodyFileRef}
                  type='file'
                  accept='.json,application/json'
                  className='hidden'
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleBodyFile(file)
                    e.target.value = ''
                  }}
                />
              </div>
            </div>
            <Textarea
              value={config.body}
              onChange={(e) => update('body', e.target.value)}
              className='min-h-[120px] font-mono text-xs dark:bg-gray-700 dark:border-gray-600'
            />
            {config.body.includes('{{') && (
              <p className='text-xs text-muted-foreground font-mono whitespace-pre-wrap break-all'>
                Resolved preview: {resolvedBody.slice(0, 200)}
                {resolvedBody.length > 200 ? '...' : ''}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
