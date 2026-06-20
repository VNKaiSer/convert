"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Upload, Download } from "lucide-react"
import type { Variable } from "@/lib/json-compare/types"
import {
  normalizeVariableValue,
  parseVariablesFromJson,
  variablesToJson,
} from "@/lib/json-compare/variable-resolver"
import { downloadTextFile } from "@/lib/json-compare/compare-helpers"

interface VariablesPanelProps {
  variables: Variable[]
  onChange: (variables: Variable[]) => void
  onClearAll: () => void
  onError: (message: string) => void
}

export function VariablesPanel({ variables, onChange, onClearAll, onError }: VariablesPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateVariable = (index: number, field: keyof Variable, value: string) => {
    onChange(variables.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const commitVariableValue = (index: number, value: string) => {
    const normalized = normalizeVariableValue(value)
    if (normalized !== value) {
      updateVariable(index, "value", normalized)
    }
  }

  const addVariable = () => {
    onChange([...variables, { key: "", value: "" }])
  }

  const removeVariable = (index: number) => {
    onChange(variables.filter((_, i) => i !== index))
  }

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text()
      onChange(parseVariablesFromJson(text))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to import variables"
      onError(message)
    }
  }

  const handleExport = () => {
    downloadTextFile(variablesToJson(variables), "variables.json", "application/json")
  }

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Variables</CardTitle>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImportFile(file)
                e.target.value = ""
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> Import JSON
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={addVariable}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-1" /> Clear all
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Use <code className="font-mono">{"{{variableName}}"}</code> in URL, headers, or body.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {variables.length === 0 ? (
          <p className="text-sm text-muted-foreground">No variables defined.</p>
        ) : (
          variables.map((variable, index) => (
            <div key={index} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-start">
              <div>
                <Label className="sr-only">Key</Label>
                <Input
                  value={variable.key}
                  onChange={(e) => updateVariable(index, "key", e.target.value)}
                  placeholder="key"
                  className="dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="space-y-1">
                <Label className="sr-only">Value</Label>
                <Textarea
                  value={variable.value}
                  onChange={(e) => updateVariable(index, "value", e.target.value)}
                  onBlur={(e) => commitVariableValue(index, e.target.value)}
                  placeholder="value"
                  rows={3}
                  className="min-h-[72px] max-h-[160px] font-mono text-xs dark:bg-gray-700 dark:border-gray-600 resize-y"
                />
                {variable.value.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    {variable.value.length.toLocaleString()} chars
                    {variable.value.trim().startsWith("[")
                      ? " · array"
                      : variable.value.trim().startsWith('"')
                        ? " · string"
                        : ""}
                  </p>
                )}
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeVariable(index)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
