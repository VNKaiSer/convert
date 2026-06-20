'use client'

import { useMemo } from 'react'
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
import { Loader2, Play, Plus, Repeat, Trash2 } from 'lucide-react'
import {
  DEFAULT_ARRAY_COMPARE_MAPPING,
  type ApiBatchProgress,
  type ApiBatchStats,
  type ArrayCompareConfig,
  type ArrayCompareMapping,
  type EndpointConfig,
  type Variable,
} from '@/lib/json-compare/types'
import { getArrayVariables } from '@/lib/json-compare/array-batch'
import { extractBodyVariableRefs } from '@/lib/json-compare/body-field-utils'
import { EndpointConfigPanel } from './endpoint-config-panel'
import { BatchFailuresPanel } from './batch-failures-panel'

interface ApiRunnerSectionProps {
  endpoint1: EndpointConfig
  endpoint2: EndpointConfig
  variables: Variable[]
  arrayCompare: ArrayCompareConfig
  batchStats: ApiBatchStats | null
  batchMode: 'single' | 'array' | null
  batchCount: number
  progress: ApiBatchProgress | null
  isCalling: boolean
  isComparePending?: boolean
  onEndpoint1Change: (config: EndpointConfig) => void
  onEndpoint2Change: (config: EndpointConfig) => void
  onArrayCompareChange: (config: ArrayCompareConfig) => void
  onCallBoth: () => void
  onCallWithVariable: () => void
  onError: (message: string) => void
}

export function ApiRunnerSection({
  endpoint1,
  endpoint2,
  variables,
  arrayCompare,
  batchStats,
  batchMode,
  batchCount,
  progress,
  isCalling,
  isComparePending = false,
  onEndpoint1Change,
  onEndpoint2Change,
  onArrayCompareChange,
  onCallBoth,
  onCallWithVariable,
  onError,
}: ApiRunnerSectionProps) {
  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0

  const arrayVariables = useMemo(
    () => getArrayVariables(variables),
    [variables],
  )

  const bodyFieldOptions = useMemo(() => {
    const refs = extractBodyVariableRefs(endpoint1.body)
    const keys = variables.map((v) => v.key.trim()).filter(Boolean)
    return Array.from(new Set([...refs, ...keys]))
  }, [endpoint1.body, variables])

  const updateMapping = (
    index: number,
    patch: Partial<ArrayCompareMapping>,
  ) => {
    onArrayCompareChange({
      mappings: arrayCompare.mappings.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    })
  }

  const addMapping = () => {
    onArrayCompareChange({
      mappings: [
        ...arrayCompare.mappings,
        { ...DEFAULT_ARRAY_COMPARE_MAPPING },
      ],
    })
  }

  const removeMapping = (index: number) => {
    if (arrayCompare.mappings.length <= 1) return
    onArrayCompareChange({
      mappings: arrayCompare.mappings.filter((_, i) => i !== index),
    })
  }

  const canCallWithVariable = useMemo(() => {
    if (arrayCompare.mappings.length === 0) return false

    const first = arrayCompare.mappings[0]
    if (!first.sourceVariable.trim() || !first.injectVariable.trim()) {
      return false
    }
    if (
      !arrayVariables.some(
        (v) => v.key.trim() === first.sourceVariable.trim(),
      )
    ) {
      return false
    }

    for (const row of arrayCompare.mappings) {
      const hasSource = row.sourceVariable.trim() !== ''
      const hasInject = row.injectVariable.trim() !== ''
      if (hasSource !== hasInject) return false
      if (
        hasSource &&
        !arrayVariables.some((v) => v.key.trim() === row.sourceVariable.trim())
      ) {
        return false
      }
    }

    return true
  }, [arrayCompare.mappings, arrayVariables])

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
        <EndpointConfigPanel
          title='Endpoint 1'
          config={endpoint1}
          variables={variables}
          onChange={onEndpoint1Change}
          onError={onError}
        />
        <EndpointConfigPanel
          title='Endpoint 2'
          config={endpoint2}
          variables={variables}
          onChange={onEndpoint2Change}
          onError={onError}
        />
      </div>

      <Card className='dark:bg-gray-800 dark:border-gray-700'>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base'>
            Call Compare with Variable
          </CardTitle>
          <p className='text-xs text-muted-foreground'>
            Thêm các cặp array → body field (vd.{' '}
            <code className='font-mono'>pcbRaws</code> →{' '}
            <code className='font-mono'>{'{{pcbRaw}}'}</code>). Hàng đầu tiên
            quyết định vòng lặp; các hàng sau inject cùng index khi còn phần tử
            (không bắt buộc cùng độ dài).
          </p>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='space-y-2'>
            {arrayCompare.mappings.map((mapping, index) => (
              <div
                key={index}
                className='grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end rounded-lg border dark:border-gray-700 p-3'
              >
                <div className='space-y-1'>
                  <Label>
                    Array{index === 0 ? ' (vòng lặp)' : ` ${index + 1}`}
                  </Label>
                  <Select
                    value={mapping.sourceVariable || undefined}
                    onValueChange={(value) =>
                      updateMapping(index, { sourceVariable: value })
                    }
                  >
                    <SelectTrigger className='dark:bg-gray-700 dark:border-gray-600'>
                      <SelectValue placeholder='Select array variable' />
                    </SelectTrigger>
                    <SelectContent>
                      {arrayVariables.length === 0 ? (
                        <SelectItem value='__none' disabled>
                          No array variables (value must start with [)
                        </SelectItem>
                      ) : (
                        arrayVariables.map((variable) => (
                          <SelectItem
                            key={variable.key}
                            value={variable.key.trim()}
                          >
                            {variable.key.trim()}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1'>
                  <Label>Body field</Label>
                  <Select
                    value={mapping.injectVariable || undefined}
                    onValueChange={(value) =>
                      updateMapping(index, { injectVariable: value })
                    }
                  >
                    <SelectTrigger className='dark:bg-gray-700 dark:border-gray-600'>
                      <SelectValue placeholder='Select body field' />
                    </SelectTrigger>
                    <SelectContent>
                      {bodyFieldOptions.length === 0 ? (
                        <SelectItem value='__none' disabled>
                          Add {'{{variable}}'} in endpoint body
                        </SelectItem>
                      ) : (
                        bodyFieldOptions.map((key) => (
                          <SelectItem key={key} value={key}>
                            {key}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='shrink-0 text-red-500 hover:text-red-600'
                  disabled={arrayCompare.mappings.length <= 1}
                  onClick={() => removeMapping(index)}
                  aria-label='Remove mapping'
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>
            ))}

            <Button
              type='button'
              variant='outline'
              size='sm'
              className='gap-1'
              onClick={addMapping}
            >
              <Plus className='h-4 w-4' /> Thêm cặp array → body field
            </Button>
          </div>

          {(isCalling || isComparePending) && (
            <div className='space-y-2 rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-900/10 p-3'>
              <div className='flex items-center justify-between text-sm'>
                <span className='font-medium text-blue-900 dark:text-blue-100'>
                  {isCalling ? 'Calling APIs…' : 'Comparing responses…'}
                </span>
                {progress && (
                  <span className='text-muted-foreground font-mono text-xs'>
                    {progress.completed}/{progress.total}
                    {progress.failed > 0 ? ` · ${progress.failed} failed` : ''}
                  </span>
                )}
              </div>
              {progress && progress.total > 0 && (
                <div className='h-2 w-full rounded-full bg-blue-100 dark:bg-blue-950 overflow-hidden'>
                  <div
                    className='h-full bg-blue-600 transition-[width] duration-150'
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {batchStats && batchMode === 'array' && !isCalling && (
            <div className='text-xs text-muted-foreground rounded-lg border dark:border-gray-700 p-3'>
              Batches: {batchStats.successBatches} ok /{' '}
              {batchStats.failedBatches} failed · {batchCount} total
              {batchStats.failureFile && (
                <span className='ml-2 font-mono'>
                  · saved {batchStats.failureFile}
                </span>
              )}
            </div>
          )}

          <div className='flex flex-wrap items-center gap-2 justify-end'>
            <Button
              onClick={onCallWithVariable}
              disabled={isCalling || !canCallWithVariable}
              className='gap-2 bg-blue-600 hover:bg-blue-700'
            >
              {isCalling ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Repeat className='h-4 w-4' />
              )}
              Call Compare with Variable
            </Button>
            <Button
              onClick={onCallBoth}
              disabled={isCalling}
              variant='outline'
              className='gap-2'
            >
              {isCalling ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Play className='h-4 w-4' />
              )}
              Call Both & Compare
            </Button>
          </div>
        </CardContent>
      </Card>

      {batchStats && batchMode === 'array' && !isCalling && (
        <BatchFailuresPanel stats={batchStats} batchCount={batchCount} />
      )}
    </div>
  )
}
