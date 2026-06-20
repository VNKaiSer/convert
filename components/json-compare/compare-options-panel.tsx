"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CompareOptions } from "@/lib/json-compare"

interface CompareOptionsPanelProps {
  options: CompareOptions
  onChange: (options: CompareOptions) => void
}

function parseIgnoreFieldsInput(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[,;\n]+/)
        .map((field) => field.trim())
        .filter(Boolean)
    )
  )
}

function formatIgnoreFieldsInput(fields: string[] | undefined): string {
  return (fields ?? []).join(", ")
}

export function CompareOptionsPanel({ options, onChange }: CompareOptionsPanelProps) {
  const setOption = <K extends keyof CompareOptions>(key: K, value: CompareOptions[K]) => {
    onChange({ ...options, [key]: value })
  }

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm border-gray-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-4 bg-gray-50 dark:bg-gray-800/80 p-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2" title="Slice decimals to compare">
            <Checkbox
              id="opt-slice"
              checked={options.sliceEquals}
              onCheckedChange={(checked) => setOption("sliceEquals", !!checked)}
            />
            <Label htmlFor="opt-slice" className="font-normal cursor-pointer dark:text-gray-300 whitespace-nowrap">
              Slice Equals
            </Label>
            <Input
              type="number"
              min="0"
              className="w-16 h-7 text-xs dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50"
              value={options.sliceDecimal}
              disabled={!options.sliceEquals}
              onChange={(e) => setOption("sliceDecimal", parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="opt-numeric"
              checked={options.numericEqual}
              onCheckedChange={(checked) => setOption("numericEqual", !!checked)}
            />
            <Label htmlFor="opt-numeric" className="font-normal cursor-pointer dark:text-gray-300">
              Number equal
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="opt-trim"
              checked={options.trimString}
              onCheckedChange={(checked) => setOption("trimString", !!checked)}
            />
            <Label htmlFor="opt-trim" className="font-normal cursor-pointer dark:text-gray-300">
              Trim string
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="opt-missing"
              checked={options.missingNullEqual}
              onCheckedChange={(checked) => setOption("missingNullEqual", !!checked)}
            />
            <Label htmlFor="opt-missing" className="font-normal cursor-pointer dark:text-gray-300">
              Missing = null
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="opt-strnum"
              checked={options.stringNumberEqual}
              onCheckedChange={(checked) => setOption("stringNumberEqual", !!checked)}
            />
            <Label htmlFor="opt-strnum" className="font-normal cursor-pointer dark:text-gray-300">
              String/Num equal
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="opt-key-case"
              checked={options.keyIgnoreCase}
              onCheckedChange={(checked) => setOption("keyIgnoreCase", !!checked)}
            />
            <Label htmlFor="opt-key-case" className="font-normal cursor-pointer dark:text-gray-300 whitespace-nowrap">
              Key Ignore Case
            </Label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Label htmlFor="opt-ignore-fields" className="whitespace-nowrap dark:text-gray-300">
            Ignore fields
          </Label>
          <Input
            id="opt-ignore-fields"
            value={formatIgnoreFieldsInput(options.ignoreFields)}
            onChange={(e) =>
              setOption("ignoreFields", parseIgnoreFieldsInput(e.target.value))
            }
            placeholder="id, requestId, traceId"
            className="h-8 flex-1 min-w-[220px] dark:bg-gray-700 dark:border-gray-600"
          />
          <span className="text-xs text-muted-foreground">
            Bỏ qua field theo tên ở mọi cấp (vd. Java có <code className="font-mono">id</code>, Node không có)
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
